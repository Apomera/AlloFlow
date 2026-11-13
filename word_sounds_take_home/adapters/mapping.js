// Take-home adapter: Sound Mapping (mapping).
// App source of truth:
//   board   compileActivityItems (word_sounds_setup_source.jsx:4678-4683, 4807-4809):
//           { graphemes: one spelling per sound, joined = the word, chipOrder: shuffled
//           [{ id, text }], chipSpans?: boxes each chip covers } or { supported: false,
//           contentStatus: 'teacher_review_required' }.
//   data    soundMappingBoard (word_sounds_module.js): no board when
//           unsupported/review-required; else the first of board.graphemes,
//           item.graphemes, phoneme .grapheme fields, the word's letters whose join
//           is the word and that fit the sounds: one box per sound, a chip covering
//           chipSpans[i] boxes (2 for qu, x, the u of cute, le; no chipSpans = 1 each).
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
    mapping_two_sounds: '{spelling} spells two sounds.',
    mapping_listen_two: 'Listen to the two sounds of {spelling}',
    mapping_slot_filled_two: 'Slots {n} and {m}: {spelling}, two sounds',
    mapping_needs_two: '{spelling} spells two sounds. Choose a slot with another slot after it.',
  },
  prepare: function (w, env) {
    var board = w && w.activityItems && w.activityItems.mapping;
    if (!board) return { missing: ['board'] };
    if (board.supported === false || board.unavailable || /review_required|needs_review/.test(board.contentStatus || '')) return { missing: ['board'] };
    var phonemes = Array.isArray(w.phonemes) ? w.phonemes : [];
    var spelling = String(env.word || '').trim().normalize('NFC').toLowerCase();
    // WS_CORE.mappingChipSpans: one box per sound; chip i covers spans[i] boxes.
    var fit = function (values, spans) {
      if (spans == null) return values.length === phonemes.length ? values.map(function () { return 1; }) : null;
      if (!Array.isArray(spans) || spans.length !== values.length || !spans.every(function (k) { return k === 1 || k === 2; })) return null;
      return spans.reduce(function (sum, k) { return sum + k; }, 0) === phonemes.length ? spans.slice() : null;
    };
    var found = [[board.graphemes, board.chipSpans], [w.graphemes, w.chipSpans], [phonemes.map(function (p) { return p && typeof p === 'object' ? p.grapheme : ''; }), null], [spelling.split(''), null]]
      .map(function (pair) {
        var values = pair[0];
        return [values, Array.isArray(values) && values.length > 0 && phonemes.length > 0 &&
          values.every(function (v) { return typeof v === 'string' && v.trim(); }) &&
          values.join('').trim().normalize('NFC').toLowerCase() === spelling ? fit(values, pair[1]) : null];
      })
      .filter(function (pair) { return pair[1]; })[0];
    if (!found) return { missing: ['board'] };
    var graphemes = found[0].map(String), spans = found[1];
    var starts = [];
    spans.reduce(function (at, k) { starts.push(at); return at + k; }, 0);
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
    // Each chip plays its sound: the word's own sound at that position. A
    // spanning chip plays its two sounds in order (no clip for the pair).
    var clips = graphemes.map(function (g, i) {
      if (spans[i] > 1) {
        return phonemes.slice(starts[i], starts[i] + spans[i]).map(function (p) {
          var part = env.label(p), partClip = part && env.phonemeClip(part);
          if (!partClip) missing.push('/' + (part || g) + '/');
          return partClip;
        });
      }
      var label = env.label(phonemes[starts[i]]);
      var clip = (label && env.phonemeClip(label)) || env.phonemeClip(g);
      if (!clip) missing.push('/' + (label || g) + '/');
      return clip;
    });
    if (missing.length) return { missing: missing };
    var spanning = spans.some(function (k) { return k > 1; });
    var result = {
      target: graphemes.join(' '), graphemes: graphemes,
      chips: order.map(function (id) { return spans[id] > 1 ? { text: graphemes[id], audio: clips[id][0], audios: clips[id], span: spans[id] } : { text: graphemes[id], audio: clips[id] }; }),
      wordAudio: wordAudio, promptAudio: prompt,
      introAudio: [prompt], answerAudio: [wordAudio],
    };
    if (spanning) result.spans = spans;
    return { item: result };
  },
  render: function (item, ctx) {
    var L = ctx.L;
    // One slot per sound. A spanning chip (item.spans[i] = 2: qu, x, the u of
    // cute, le) covers two slots side by side. No spans = one slot per chip.
    var spanOf = function (ci) { return item.chips[ci].span || 1; };
    var n = (item.spans || item.graphemes.map(function () { return 1; })).reduce(function (sum, k) { return sum + k; }, 0);
    var slots = [];
    for (var s = 0; s < n; s++) slots.push(null);
    var picked = null;
    var locked = function () { return ctx.isDone(); };
    var text = function (ci) { return item.chips[ci].text; };
    var covered = function (si) { return si > 0 && slots[si] != null && slots[si - 1] === slots[si]; };
    var hear = function (ci) { var chip = item.chips[ci]; if (chip.audios) ctx.playAll(chip.audios); else ctx.play(chip.audio); };
    var takeOut = function (ci) { for (var i = 0; i < n; i++) if (slots[i] === ci) slots[i] = null; };

    var tray = ctx.el('ul', { class: 'row', 'aria-label': L.mapping_tray, style: 'list-style:none;padding:0;margin:16px 0;gap:12px' });
    var chipEls = item.chips.map(function (chip, ci) {
      var two = spanOf(ci) > 1;
      var pick = ctx.el('button', { type: 'button', class: 'primary', 'aria-pressed': 'false',
        'aria-label': ctx.fmt(L.mapping_pick, { spelling: chip.text }) + (two ? '. ' + ctx.fmt(L.mapping_two_sounds, { spelling: chip.text }) : ''),
        'data-span': two ? String(spanOf(ci)) : null,
        style: (two ? 'min-width:154px;' : 'min-width:72px;') + 'min-height:56px;font-size:1.5rem;font-weight:700',
        on: { click: function () { onChip(ci); } } }, [chip.text]);
      var listen = ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(two ? L.mapping_listen_two : L.mapping_listen, { spelling: chip.text }),
        on: { click: function () { ctx.support('soundListens'); hear(ci); } } }, ['▶']);
      var li = ctx.el('li', { class: 'row', style: 'gap:6px;border:2px solid var(--line);border-radius:14px;padding:6px' }, [pick, listen]);
      tray.appendChild(li);
      return { li: li, pick: pick };
    });
    var slotList = ctx.el('ol', { class: 'slots', 'aria-label': L.mapping_slots });
    var slotEls = slots.map(function (_, si) {
      var btn = ctx.el('button', { type: 'button', class: 'slot', style: 'min-width:80px;min-height:80px;font-size:1.5rem;font-weight:700',
        on: { click: function () { onSlot(si); } } });
      var li = ctx.el('li', {}, [btn]);
      slotList.appendChild(li);
      return { btn: btn, li: li };
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
      slotEls.forEach(function (el, si) {
        var btn = el.btn, ci = slots[si];
        // The second slot under a spanning chip is drawn by the chip's first slot.
        el.li.hidden = covered(si);
        var two = ci != null && spanOf(ci) > 1;
        btn.textContent = ci == null ? String(si + 1) : text(ci);
        btn.style.minWidth = two ? '170px' : '80px';
        if (two) btn.setAttribute('data-span', String(spanOf(ci))); else btn.removeAttribute('data-span');
        btn.style.borderStyle = ci == null ? 'dashed' : 'solid';
        btn.style.borderColor = ci == null ? 'var(--muted)' : 'var(--accent)';
        btn.setAttribute('aria-label', ci == null ? ctx.fmt(L.mapping_slot_empty, { n: si + 1 })
          : two ? ctx.fmt(L.mapping_slot_filled_two, { n: si + 1, m: si + spanOf(ci), spelling: text(ci) })
          : ctx.fmt(L.mapping_slot_filled, { n: si + 1, spelling: text(ci) }));
        if (locked()) btn.setAttribute('aria-disabled', 'true');
      });
      if (locked()) clearBtn.setAttribute('aria-disabled', 'true');
    };
    var onChip = function (ci) {
      if (locked() || slots.indexOf(ci) >= 0) return;
      if (picked === ci) { picked = null; draw(); ctx.announce(ctx.fmt(L.mapping_dropped, { spelling: text(ci) })); return; }
      picked = ci;
      draw();
      hear(ci);
      ctx.announce(ctx.fmt(L.mapping_picked, { spelling: text(ci) }));
      var empty = slots.indexOf(null);
      slotEls[empty >= 0 ? empty : 0].btn.focus();
    };
    var onSlot = function (si) {
      if (locked()) return;
      if (picked == null) {
        var out = slots[si];
        if (out == null) { ctx.announce(L.mapping_how); return; }
        var first = slots.indexOf(out);
        takeOut(out);
        draw();
        ctx.announce(ctx.fmt(L.mapping_removed, { spelling: text(out), n: first + 1 }));
        return;
      }
      var ci = picked, span = spanOf(ci);
      // A spanning chip cannot start in the last slot.
      if (si + span > n) { ctx.announce(ctx.fmt(L.mapping_needs_two, { spelling: text(ci) })); return; }
      picked = null;
      for (var k = 0; k < span; k++) if (slots[si + k] != null) takeOut(slots[si + k]); // chips already there go back to the tray
      for (var j = 0; j < span; j++) slots[si + j] = ci;
      draw();
      if (slots.indexOf(null) >= 0) {
        hear(ci);
        ctx.announce(ctx.fmt(L.mapping_placed, { spelling: text(ci), n: si + 1 }));
        for (var c = 0; c < chipEls.length; c++) if (slots.indexOf(c) < 0) { chipEls[c].pick.focus(); break; }
        return;
      }
      // The last slot filled: grade the chips in slot order.
      var order = slots.filter(function (c2, i) { return !covered(i); });
      var right = order.length === item.graphemes.length && order.every(function (c2, i) {
        return String(text(c2)) === String(item.graphemes[i]) && spanOf(c2) === ((item.spans && item.spans[i]) || 1);
      });
      ctx.answer(order.map(text).join(' '), right, {
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
    // Hear all (the player's ctx.hearAll): each spelling still in the tray, in turn, marked with its number.
    var hearing = typeof ctx.hearAll === 'function' ? ctx.hearAll({ ready: function () { return !locked(); },
      list: function () { return chipEls.map(function (c, ci) { return c.li.hidden ? null : { box: c.li, n: ci + 1, total: chipEls.length, say: function () { var chip = item.chips[ci]; return chip.audios ? ctx.playAll(chip.audios) : ctx.play(chip.audio); } }; }); } }) : null;
    if (hearing) ctx.root.appendChild(hearing.node);
    ctx.root.appendChild(tray);
    draw();
    return {
      reveal: function (correct) {
        picked = null;
        if (!correct) {
          var used = [];
          for (var i = 0; i < n; i++) slots[i] = null;
          for (var g = 0, box = 0; g < item.graphemes.length; g++) {
            var want = (item.spans && item.spans[g]) || 1, hit = -1;
            for (var ci = 0; ci < item.chips.length && hit < 0; ci++) if (used.indexOf(ci) < 0 && item.chips[ci].text === item.graphemes[g] && spanOf(ci) === want) hit = ci;
            used.push(hit);
            for (var k = 0; k < want; k++) slots[box + k] = hit < 0 ? null : hit;
            box += want;
          }
        }
        draw();
        slotEls.forEach(function (el) { el.btn.style.borderColor = 'var(--ok)'; el.btn.style.background = 'var(--ok-bg)'; });
      },
    };
  },
};
