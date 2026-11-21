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
// 2026-11-13: each tray chip has Listen first, then the spelling to pick up (as every Listen +
// Choose pair now).
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
    mapping_says: '{spelling} says /{sound}/ here.',
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
    // 2026-11-18: a spelling that says a surprising sound in this word (the s of dogs says /z/) carries
    // that sound, so the board can explain it the first time the child plays the chip. Only these
    // well-known patterns; vowels and ordinary spellings get no note.
    var SAYS = { s: ['z', 'sh', 'zh'], se: ['z'], c: ['s'], ce: ['s'], ci: ['sh'], ti: ['sh'], g: ['j'], ge: ['j'], ch: ['k', 'sh'], x: ['gz'], ed: ['t', 'd'] };
    var says = graphemes.map(function (g, i) {
      var sound = phonemes.slice(starts[i], starts[i] + spans[i]).map(function (p) { return env.label(p) || ''; }).join('');
      var want = SAYS[String(g).toLowerCase()];
      return want && want.indexOf(sound) >= 0 ? sound : '';
    });
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
      chips: order.map(function (id) { var chip = spans[id] > 1 ? { text: graphemes[id], audio: clips[id][0], audios: clips[id], span: spans[id] } : { text: graphemes[id], audio: clips[id] }; if (says[id]) chip.says = says[id]; return chip; }),
      wordAudio: wordAudio, promptAudio: prompt,
      introAudio: [prompt], answerAudio: [wordAudio],
    };
    if (spanning) result.spans = spans;
    return { item: result };
  },
  render: function (item, ctx) {
    var doc = ctx.root.ownerDocument;
    var L = ctx.L;
    // One slot per sound. A spanning chip (item.spans[i] = 2: qu, x, the u of
    // cute, le) covers two slots side by side. No spans = one slot per chip.
    var spanOf = function (ci) { return item.chips[ci].span || 1; };
    var expSpans = item.spans || item.graphemes.map(function () { return 1; });
    var expStarts = [];
    var n = expSpans.reduce(function (sum, k) { expStarts.push(sum); return sum + k; }, 0);
    var slots = [];
    for (var s = 0; s < n; s++) slots.push(null);
    var picked = null;
    var errors = [];
    var locked = function () { return ctx.isDone(); };
    var text = function (ci) { return item.chips[ci].text; };
    var covered = function (si) { return si > 0 && slots[si] != null && slots[si - 1] === slots[si]; };
    // The surprising-sound notes ("s says /z/ here.") appear the first time a chip is played and stay for this word.
    // Never in a check (ctx.check): there the note would give away what the check measures. In practice a
    // note shown while the child works counts as help (support 'spellingNotes'); the ones shown with the answer do not.
    var notesEl = ctx.el('div', { 'data-mapping-notes': '', 'aria-live': 'polite' }), noted = [];
    var note = function (ci, help) {
      var chip = item.chips[ci];
      if (ctx.check || !chip || !chip.says || noted.indexOf(ci) >= 0) return;
      noted.push(ci);
      notesEl.appendChild(ctx.el('p', { class: 'letters', 'data-mapping-says': chip.text, text: ctx.fmt(L.mapping_says, { spelling: chip.text, sound: chip.says }) }));
      if (help) ctx.support('spellingNotes');
    };
    var hear = function (ci) { var chip = item.chips[ci]; if (chip.audios) ctx.playAll(chip.audios); else ctx.play(chip.audio); note(ci, true); };
    var takeOut = function (ci) { for (var i = 0; i < n; i++) if (slots[i] === ci) slots[i] = null; };

    var drag = null, dragEndedAt = 0;
    var dragged = function () { return Date.now() - dragEndedAt < 400; };
    var dragStart = function (e, ci, from, si) {
      if (locked() || e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { ci: ci, from: from, si: si, x: e.clientX, y: e.clientY, src: e.currentTarget, ghost: null };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
      e.currentTarget.addEventListener('pointermove', dragMove);
      e.currentTarget.addEventListener('pointerup', dragEnd);
      e.currentTarget.addEventListener('pointercancel', dragEnd);
    };
    var dragMove = function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.ghost) {
        if (dx * dx + dy * dy < 100) return;
        var g = drag.src.cloneNode(true);
        ['data-map-tile', 'data-map-slot', 'aria-label', 'aria-pressed'].forEach(function (a) { g.removeAttribute(a); });
        g.setAttribute('aria-hidden', 'true');
        var r = drag.src.getBoundingClientRect();
        g.style.cssText += ';position:fixed;margin:0;z-index:60;pointer-events:none;opacity:.92;width:' + r.width + 'px;height:' + r.height + 'px';
        doc.body.appendChild(g);
        drag.ghost = g;
        drag.w = r.width; drag.h = r.height;
        if (drag.from === 'tray') { picked = drag.ci; draw(); }
      }
      drag.ghost.style.left = (e.clientX - drag.w / 2) + 'px';
      drag.ghost.style.top = (e.clientY - drag.h / 2) + 'px';
      e.preventDefault();
    };
    var dragEnd = function (e) {
      var d = drag;
      drag = null;
      if (!d) return;
      d.src.removeEventListener('pointermove', dragMove);
      d.src.removeEventListener('pointerup', dragEnd);
      d.src.removeEventListener('pointercancel', dragEnd);
      if (!d.ghost) return;
      if (d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
      dragEndedAt = Date.now();
      var at = e.type === 'pointercancel' ? null : (typeof doc.elementFromPoint === 'function' ? doc.elementFromPoint(e.clientX, e.clientY) : null);
      var slotNode = at && at.closest ? at.closest('[data-map-slot]') : null;
      var trayNode = at && at.closest ? at.closest('[data-map-tray]') : null;
      if (slotNode && ctx.root.contains(slotNode)) {
        var to = Number(slotNode.getAttribute('data-map-slot'));
        if (d.from === 'tray') {
          placeChip(d.ci, to, null);
        } else if (to !== d.si) {
          var span = spanOf(d.ci);
          if (to + span > n) { ctx.announce(ctx.fmt(L.mapping_needs_two, { spelling: text(d.ci) })); return; }
          var swapSingle = span === 1 && slots[to] != null && spanOf(slots[to]) === 1 ? slots[to] : null;
          takeOut(d.ci);
          if (swapSingle != null) {
            slots[to] = d.ci;
            slots[d.si] = swapSingle;
          } else {
            for (var k = 0; k < span; k++) if (slots[to + k] != null) takeOut(slots[to + k]);
            for (var j = 0; j < span; j++) slots[to + j] = d.ci;
          }
          picked = null; errors = [];
          draw();
          afterPlace(d.ci, to, null);
        }
      } else if (trayNode && d.from === 'slot') {
        var first = slots.indexOf(d.ci);
        takeOut(d.ci);
        errors = [];
        draw();
        ctx.announce(ctx.fmt(L.mapping_removed, { spelling: text(d.ci), n: first + 1 }));
      } else if (d.from === 'tray') {
        picked = null; draw();
      }
    };

    var chipSlot = function (ci) { return ci % 6; };
    var chipBg = function (ci) { return 'var(--c' + chipSlot(ci) + 'b,var(--soft))'; };
    var chipBd = function (ci) { return 'var(--c' + chipSlot(ci) + ',var(--accent))'; };
    var tray = ctx.el('ul', { class: 'row', 'data-map-tray': '', 'aria-label': L.mapping_tray, style: 'list-style:none;padding:0;margin:16px 0;gap:12px' });
    var chipEls = item.chips.map(function (chip, ci) {
      var two = spanOf(ci) > 1;
      var pick = ctx.el('button', { type: 'button', class: 'primary', 'aria-pressed': 'false', 'data-map-tile': String(ci), 'data-map-c': String(chipSlot(ci)),
        'aria-label': ctx.fmt(L.mapping_pick, { spelling: chip.text }) + (two ? '. ' + ctx.fmt(L.mapping_two_sounds, { spelling: chip.text }) : ''),
        'data-span': two ? String(spanOf(ci)) : null,
        style: (two ? 'min-width:var(--map-span,154px);' : 'min-width:var(--map-sz,72px);') + 'min-height:var(--map-h,56px);font-size:1.5rem;font-weight:700;touch-action:none;color:var(--ink);background:' + chipBg(ci) + ';border:3px solid ' + chipBd(ci) + ';box-shadow:0 3px 0 ' + chipBd(ci),
        on: { click: function (e) { if (dragged()) return; onChip(ci, e); }, pointerdown: function (e) { dragStart(e, ci, 'tray', -1); } } }, [chip.text]);
      var li = ctx.el('li', { class: 'row', style: 'gap:6px' }, [pick]);
      tray.appendChild(li);
      return { li: li, pick: pick };
    });
    var slotList = ctx.el('ol', { class: 'slots', dir: 'ltr', 'aria-label': L.mapping_slots });
    var slotEls = slots.map(function (_, si) {
      var btn = ctx.el('button', { type: 'button', class: 'slot', 'data-map-slot': String(si), style: 'min-width:var(--map-box,80px);min-height:var(--map-box,80px);border-width:3px;font-size:1.5rem;font-weight:700',
        on: { click: function (e) { if (dragged()) return; onSlot(si, e); }, pointerdown: function (e) { if (slots[si] != null) dragStart(e, slots[si], 'slot', si); } } });
      var li = ctx.el('li', {}, [btn]);
      slotList.appendChild(li);
      return { btn: btn, li: li };
    });
    var clearBtn = ctx.el('button', { type: 'button', on: { click: function () {
      if (locked()) return;
      picked = null; errors = [];
      for (var i = 0; i < n; i++) slots[i] = null;
      draw(); ctx.announce(L.mapping_cleared);
    } }, text: L.mapping_clear });

    var draw = function () {
      var holding = picked != null && !locked();
      chipEls.forEach(function (c, ci) {
        c.li.hidden = slots.indexOf(ci) >= 0;
        var on = picked === ci;
        var bg = chipBg(ci), bd = chipBd(ci);
        c.pick.setAttribute('aria-pressed', on ? 'true' : 'false');
        c.pick.style.background = on ? bd : bg;
        c.pick.style.color = on ? 'var(--accent-ink)' : 'var(--ink)';
        c.pick.style.borderColor = bd;
        c.pick.style.boxShadow = on ? '0 0 0 3px var(--card), 0 0 0 7px ' + bd : '0 3px 0 ' + bd;
        if (locked()) c.pick.setAttribute('aria-disabled', 'true');
      });
      slotEls.forEach(function (el, si) {
        var btn = el.btn, ci = slots[si];
        // The second slot under a spanning chip is drawn by the chip's first slot.
        el.li.hidden = covered(si);
        var two = ci != null && spanOf(ci) > 1;
        var bad = errors.indexOf(si) >= 0 && ci != null;
        btn.textContent = '';
        if (ci == null) {
          btn.style.position = '';
          btn.textContent = String(si + 1);
        } else if (two) {
          btn.style.position = 'relative';
          btn.appendChild(ctx.el('span', { text: text(ci) }));
          btn.appendChild(ctx.el('span', {
            'aria-hidden': 'true',
            'data-span-dots': '',
            style: 'position:absolute;inset-inline:0;bottom:4px;display:flex;justify-content:space-around;font-size:0.7rem;line-height:1;opacity:0.75;pointer-events:none',
          }, [ctx.el('span', { text: '●' }), ctx.el('span', { text: '●' })]));
        } else {
          btn.style.position = '';
          btn.textContent = text(ci);
        }
        btn.style.minWidth = two ? 'var(--map-span-box,170px)' : 'var(--map-box,80px)';
        if (two) btn.setAttribute('data-span', String(spanOf(ci))); else btn.removeAttribute('data-span');
        if (ci != null && !bad) btn.setAttribute('data-map-c', String(chipSlot(ci))); else btn.removeAttribute('data-map-c');
        if (bad) btn.setAttribute('data-mapping-error', 'true'); else btn.removeAttribute('data-mapping-error');
        btn.style.borderStyle = ci == null ? 'dashed' : 'solid';
        btn.style.borderColor = bad ? 'var(--warn)' : ci == null ? (holding ? 'var(--accent)' : 'var(--muted)') : chipBd(ci);
        btn.style.background = bad ? 'var(--warn-bg)' : ci == null ? (holding ? 'var(--soft)' : '') : chipBg(ci);
        btn.style.color = bad ? 'var(--warn)' : ci == null ? '' : 'var(--ink)';
        btn.style.boxShadow = ci == null && holding ? '0 0 0 3px var(--accent)' : '';
        btn.style.touchAction = ci == null ? 'manipulation' : 'none';
        var baseLabel = ci == null ? ctx.fmt(L.mapping_slot_empty, { n: si + 1 })
          : two ? ctx.fmt(L.mapping_slot_filled_two, { n: si + 1, m: si + spanOf(ci), spelling: text(ci) })
          : ctx.fmt(L.mapping_slot_filled, { n: si + 1, spelling: text(ci) });
        btn.setAttribute('aria-label', bad ? baseLabel + ', check this one' : baseLabel);
        if (locked()) btn.setAttribute('aria-disabled', 'true');
      });
      if (locked()) clearBtn.setAttribute('aria-disabled', 'true');
    };
    var byKey = function (e) { return !e || e.detail === 0; };
    var onChip = function (ci, e) {
      if (locked() || slots.indexOf(ci) >= 0) return;
      if (picked === ci) { picked = null; draw(); ctx.announce(ctx.fmt(L.mapping_dropped, { spelling: text(ci) })); return; }
      picked = ci;
      draw();
      ctx.support('soundListens');
      hear(ci);
      ctx.announce(ctx.fmt(L.mapping_picked, { spelling: text(ci) }));
      var empty = slots.indexOf(null);
      if (byKey(e)) slotEls[empty >= 0 ? empty : 0].btn.focus();
    };
    var afterPlace = function (ci, si, e) {
      if (slots.indexOf(null) >= 0) {
        hear(ci);
        ctx.announce(ctx.fmt(L.mapping_placed, { spelling: text(ci), n: si + 1 }));
        if (e && byKey(e)) { for (var c = 0; c < chipEls.length; c++) if (slots.indexOf(c) < 0) { chipEls[c].pick.focus(); break; } }
        return;
      }
      // The last slot filled: grade the chips in slot order.
      var order = [], bad = [];
      for (var i = 0; i < n; i++) {
        if (covered(i)) continue;
        var c2 = slots[i];
        order.push(c2);
        var expIdx = expStarts.indexOf(i);
        var okSlot = expIdx >= 0 && String(text(c2)) === String(item.graphemes[expIdx]) && spanOf(c2) === expSpans[expIdx];
        if (!okSlot) bad.push(i);
      }
      var right = order.length === item.graphemes.length && bad.length === 0;
      var outcome = ctx.answer(order.map(text).join(' '), right, {
        correctText: L.mapping_correct,
        retryText: L.mapping_retry,
        missedText: ctx.fmt(L.mapping_missed, { spellings: item.graphemes.join(' ') }),
      });
      // A first miss stays on the board and marks wrong slots to check.
      if (outcome === 'retry') { errors = bad; draw(); }
    };
    var placeChip = function (ci, si, e) {
      var span = spanOf(ci);
      // A spanning chip cannot start in the last slot.
      if (si + span > n) { picked = null; draw(); ctx.announce(ctx.fmt(L.mapping_needs_two, { spelling: text(ci) })); return; }
      picked = null; errors = [];
      for (var k = 0; k < span; k++) if (slots[si + k] != null) takeOut(slots[si + k]); // chips already there go back to the tray
      for (var j = 0; j < span; j++) slots[si + j] = ci;
      draw();
      afterPlace(ci, si, e);
    };
    var onSlot = function (si, e) {
      if (locked()) return;
      if (picked == null) {
        var out = slots[si];
        if (out == null) { ctx.announce(L.mapping_how); return; }
        var first = slots.indexOf(out);
        takeOut(out);
        errors = [];
        draw();
        ctx.announce(ctx.fmt(L.mapping_removed, { spelling: text(out), n: first + 1 }));
        return;
      }
      if (si + spanOf(picked) > n) { ctx.announce(ctx.fmt(L.mapping_needs_two, { spelling: text(picked) })); return; }
      placeChip(picked, si, e);
    };

    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: L.mapping_question }));
    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.fmt(L.mapping_word, { word: item.word }) }));
    ctx.root.appendChild(ctx.el('p', { class: 'muted', text: L.mapping_how + ' ' + L.mapping_auto }));
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: L.hear_question }),
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: L.hear_word }),
    ]));
    ctx.root.appendChild(slotList);
    ctx.root.appendChild(notesEl);
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [clearBtn]));
    // Hear all (the player's ctx.hearAll): each spelling still in the tray, in turn, marked with its number.
    var hearing = typeof ctx.hearAll === 'function' ? ctx.hearAll({ ready: function () { return !locked(); },
      list: function () { return chipEls.map(function (c, ci) { return c.li.hidden ? null : { box: c.li, n: ci + 1, total: chipEls.length, say: function () { var chip = item.chips[ci]; return chip.audios ? ctx.playAll(chip.audios) : ctx.play(chip.audio); } }; }); } }) : null;
    if (hearing) ctx.root.appendChild(hearing.node);
    ctx.root.appendChild(tray);
    draw();
    return {
      reveal: function (correct) {
        picked = null; errors = [];
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
        // The answer shown: every surprising spelling of the word is explained too.
        item.chips.forEach(function (chip, ci) { note(ci, false); });
        slotEls.forEach(function (el) { el.btn.removeAttribute('data-map-c'); el.btn.style.borderColor = 'var(--ok)'; el.btn.style.background = 'var(--ok-bg)'; el.btn.style.color = ''; });
      },
    };
  },
};
