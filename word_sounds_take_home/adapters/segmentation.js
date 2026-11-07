// Take-home adapter: Break it Down (segmentation, Elkonin boxes).
// App source of truth:
//   board   compileActivityItems (word_sounds_setup_source.jsx:4603-4610, 4800):
//           { chips: [{ id, phoneme, type, isDistractor }] (the word's sounds plus
//           up to 5 distractor sounds, shuffled), slotCount: phonemeCount || phonemes.length }.
//   view    word_sounds_module.js:19138-19364 ("segmentation"): one box per sound
//           (boxes = phonemeCount || phonemes.length, :15077-15109), the chip tray,
//           tap-to-pick + tap-to-place (:18269-18302), "Test Sequence" (:18795),
//           Check enabled only when every box is filled.
//   grading word_sounds_module.js:19311-19356: per box, a LOCAL normalizePhoneme
//           (lowercase/trim + a small vowel/alias map) of the box chip must equal the
//           same normalisation of the expected phoneme at that index; then
//           checkAnswer("wrong","right") or ("correct","correct"). Default budget 2
//           tries (:17130). A miss keeps the boxes and marks the wrong ones (:19349).
//   audio   inst_segmentation then the word (INST_KEY_MAP :16453, :16847-16854);
//           each chip plays its sound when picked or placed (:18239, :18294).
module.exports = {
  id: 'segmentation',
  title: 'Break it Down',
  labels: {
    segmentation_question: 'Break the word into its sounds. Put each sound in a box, in order.',
    segmentation_how: 'Tap a sound to pick it up, then tap a box to put it there. Tap a filled box to take its sound out.',
    segmentation_tray: 'Sounds to place',
    segmentation_boxes: 'Sound boxes',
    segmentation_box_empty: 'Box {n}, empty',
    segmentation_box_filled: 'Box {n}: {sound}',
    segmentation_box_check: 'Box {n}: {sound}, check this one',
    segmentation_pick: 'Pick up {sound}',
    segmentation_picked: '{sound} picked up. Now choose a box.',
    segmentation_dropped: '{sound} put back.',
    segmentation_placed: '{sound} is in box {n}.',
    segmentation_removed: '{sound} taken out of box {n}.',
    segmentation_cleared: 'All the boxes are empty again.',
    segmentation_clear: 'Empty the boxes',
    segmentation_play_boxes: 'Play my sounds',
    segmentation_check: 'Check',
    segmentation_fill_first: 'Put a sound in every box first.',
    segmentation_retry: 'Not quite. Fix the boxes marked to check, then try once more.',
    segmentation_correct: 'Yes! You found every sound.',
    segmentation_missed: 'The sounds are {sounds}. Listen.',
    segmentation_missed_no_letters: 'Here are the sounds, in order. Listen.',
  },
  prepare: function (w, env) {
    var board = w && w.activityItems && w.activityItems.segmentation;
    if (!board || !Array.isArray(board.chips)) return { missing: ['board'] };
    var phonemes = Array.isArray(w.phonemes) ? w.phonemes : [];
    var sounds = phonemes.map(function (p) { return env.label(p); });
    // The app's boxes come from phonemeCount || phonemes.length; its Check does
    // nothing when that differs from the expected phonemes (:19314).
    var boxes = Number(w.phonemeCount) || sounds.length;
    if (!sounds.length || sounds.some(function (s) { return !s; }) || boxes !== sounds.length) return { missing: ['board'] };
    var chips = board.chips.map(function (c) { return env.label(c && c.phoneme); });
    if (chips.length < sounds.length || chips.some(function (c) { return !c; })) return { missing: ['board'] };
    // Same local equivalence the grader uses: every expected sound needs its own chip.
    var MAP = { 'ā': 'ay', 'ē': 'ee', 'ī': 'ie', 'ō': 'oa', 'ū': 'oo', 'ă': 'a', 'ĕ': 'e', 'ĭ': 'i', 'ŏ': 'o', 'ŭ': 'u', oi: 'oy', aw: 'au', ew: 'oo', oe: 'oa' };
    var norm = function (p) { var l = String(p || '').toLowerCase().trim(); return Object.prototype.hasOwnProperty.call(MAP, l) ? MAP[l] : l; };
    var free = chips.map(norm);
    for (var i = 0; i < sounds.length; i++) {
      var at = free.indexOf(norm(sounds[i]));
      if (at < 0) return { missing: ['board'] };
      free[at] = null;
    }
    var missing = [];
    var wordAudio = env.wordClip(env.word);
    if (!wordAudio) missing.push('word');
    var prompt = env.bankClip('instructions', 'inst_segmentation');
    if (!prompt) missing.push('question');
    var clipOf = {};
    chips.concat(sounds).forEach(function (label) {
      if (Object.prototype.hasOwnProperty.call(clipOf, label)) return;
      clipOf[label] = env.phonemeClip(label);
      if (!clipOf[label]) missing.push('/' + label + '/');
    });
    if (missing.length) return { missing: missing };
    return { item: {
      target: sounds.join(' '), sounds: sounds,
      chips: chips.map(function (label) { return { label: label, audio: clipOf[label] }; }),
      wordAudio: wordAudio, promptAudio: prompt,
      introAudio: [prompt, wordAudio],
      answerAudio: [wordAudio].concat(sounds.map(function (s) { return clipOf[s]; })),
    } };
  },
  render: function (item, ctx) {
    var win = ctx.root.ownerDocument.defaultView;
    var L = ctx.L;
    // word_sounds_module.js:19317-19336, copied exactly.
    var MAP = { 'ā': 'ay', 'ē': 'ee', 'ī': 'ie', 'ō': 'oa', 'ū': 'oo', 'ă': 'a', 'ĕ': 'e', 'ĭ': 'i', 'ŏ': 'o', 'ŭ': 'u', oi: 'oy', aw: 'au', ew: 'oo', oe: 'oa' };
    var norm = function (p) { var l = String(p || '').toLowerCase().trim(); return Object.prototype.hasOwnProperty.call(MAP, l) ? MAP[l] : l; };
    var n = item.sounds.length;
    var boxes = [];
    for (var b = 0; b < n; b++) boxes.push(null);
    var picked = null;
    var errors = [];
    var token = 0;
    var name = function (ci) { return ctx.showLetters ? '/' + item.chips[ci].label + '/' : ctx.fmt(L.sound_n, { n: ci + 1 }); };
    var locked = function () { return ctx.isDone(); };
    var halt = function () { token++; };

    var tray = ctx.el('ul', { class: 'row', 'aria-label': L.segmentation_tray, style: 'list-style:none;padding:0;margin:16px 0;gap:12px' });
    var chipEls = item.chips.map(function (chip, ci) {
      var pick = ctx.el('button', { type: 'button', class: 'primary', 'aria-pressed': 'false',
        'aria-label': ctx.fmt(L.segmentation_pick, { sound: name(ci) }),
        style: 'min-width:72px;min-height:56px;font-size:1.3rem;font-weight:700',
        on: { click: function () { onChip(ci); } } }, [name(ci)]);
      var listen = ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(L.listen_sound, { n: ci + 1 }) + (ctx.showLetters ? ' ' + name(ci) : ''),
        on: { click: function () { halt(); ctx.support('soundListens'); ctx.play(chip.audio); } } }, ['▶']);
      var li = ctx.el('li', { class: 'row', style: 'gap:6px;border:2px solid var(--line);border-radius:14px;padding:6px' }, [pick, listen]);
      tray.appendChild(li);
      return { li: li, pick: pick };
    });
    var boxList = ctx.el('ol', { class: 'slots', 'aria-label': L.segmentation_boxes });
    var boxEls = boxes.map(function (_, bi) {
      var btn = ctx.el('button', { type: 'button', class: 'slot', style: 'min-width:80px;min-height:80px;border-style:dashed;font-size:1.3rem;font-weight:700',
        on: { click: function () { onBox(bi); } } });
      boxList.appendChild(ctx.el('li', {}, [btn]));
      return btn;
    });
    var checkBtn = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { onCheck(); } }, text: L.segmentation_check });
    var clearBtn = ctx.el('button', { type: 'button', on: { click: function () {
      if (locked()) return;
      halt(); picked = null; errors = [];
      for (var i = 0; i < n; i++) boxes[i] = null;
      draw(); ctx.announce(L.segmentation_cleared);
    } }, text: L.segmentation_clear });
    // "Test Sequence" (:18795-18815): each box's sound, 500 ms apart; 600 ms for an empty box.
    var playBoxes = ctx.el('button', { type: 'button', on: { click: function () {
      ctx.support('sequenceReplays');
      var mine = ++token, i = 0;
      var step = function () {
        if (mine !== token || !ctx.root.isConnected || i >= n) return;
        var ci = boxes[i++];
        if (ci == null) { win.setTimeout(step, 600); return; }
        ctx.play(item.chips[ci].audio).then(function () { if (mine === token) win.setTimeout(step, 500); });
      };
      step();
    } }, text: L.segmentation_play_boxes });

    var draw = function () {
      var full = boxes.every(function (x) { return x != null; });
      chipEls.forEach(function (c, ci) {
        c.li.hidden = boxes.indexOf(ci) >= 0;
        c.pick.setAttribute('aria-pressed', picked === ci ? 'true' : 'false');
        if (locked()) c.pick.setAttribute('aria-disabled', 'true');
      });
      boxEls.forEach(function (btn, bi) {
        var ci = boxes[bi];
        btn.textContent = ci == null ? String(bi + 1) : name(ci);
        btn.style.borderStyle = ci == null ? 'dashed' : 'solid';
        var bad = errors.indexOf(bi) >= 0 && ci != null;
        btn.style.borderColor = bad ? 'var(--warn)' : ci == null ? 'var(--muted)' : 'var(--accent)';
        btn.style.background = bad ? 'var(--warn-bg)' : '';
        btn.setAttribute('aria-label', ci == null ? ctx.fmt(L.segmentation_box_empty, { n: bi + 1 })
          : ctx.fmt(bad ? L.segmentation_box_check : L.segmentation_box_filled, { n: bi + 1, sound: name(ci) }));
        if (locked()) btn.setAttribute('aria-disabled', 'true');
      });
      checkBtn.setAttribute('aria-disabled', locked() || !full ? 'true' : 'false');
      if (locked()) clearBtn.setAttribute('aria-disabled', 'true');
    };
    var nextFocus = function () {
      if (boxes.indexOf(null) < 0) return checkBtn;
      for (var ci = 0; ci < chipEls.length; ci++) if (boxes.indexOf(ci) < 0) return chipEls[ci].pick;
      return checkBtn;
    };
    var onChip = function (ci) {
      if (locked() || boxes.indexOf(ci) >= 0) return;
      halt();
      if (picked === ci) { picked = null; draw(); ctx.announce(ctx.fmt(L.segmentation_dropped, { sound: name(ci) })); return; }
      picked = ci;
      draw();
      ctx.play(item.chips[ci].audio);
      ctx.announce(ctx.fmt(L.segmentation_picked, { sound: name(ci) }));
      // Keyboard path: go straight to the first empty box.
      var empty = boxes.indexOf(null);
      boxEls[empty >= 0 ? empty : 0].focus();
    };
    var onBox = function (bi) {
      if (locked()) return;
      halt();
      errors = [];
      if (picked == null) {
        var out = boxes[bi];
        if (out == null) { ctx.announce(L.segmentation_how); return; }
        boxes[bi] = null;
        draw();
        ctx.announce(ctx.fmt(L.segmentation_removed, { sound: name(out), n: bi + 1 }));
        return;
      }
      var ci = picked;
      picked = null;
      boxes[bi] = ci; // a chip already there goes back to the tray
      draw();
      ctx.play(item.chips[ci].audio);
      ctx.announce(ctx.fmt(L.segmentation_placed, { sound: name(ci), n: bi + 1 }));
      nextFocus().focus();
    };
    var onCheck = function () {
      if (locked()) return;
      if (boxes.some(function (x) { return x == null; })) { ctx.announce(L.segmentation_fill_first); return; }
      halt();
      var bad = [];
      boxes.forEach(function (ci, i) { if (norm(item.chips[ci].label) !== norm(item.sounds[i])) bad.push(i); });
      var response = boxes.map(function (ci) { return item.chips[ci].label; }).join(' ');
      var outcome = ctx.answer(response, bad.length === 0, {
        correctText: L.segmentation_correct,
        retryText: L.segmentation_retry,
        missedText: ctx.showLetters ? ctx.fmt(L.segmentation_missed, { sounds: item.sounds.map(function (s) { return '/' + s + '/'; }).join(' ') })
          : L.segmentation_missed_no_letters,
      });
      // A first miss keeps the boxes and marks the wrong ones (:19348-19350).
      if (outcome === 'retry') { errors = bad; draw(); }
    };

    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: L.segmentation_question }));
    ctx.root.appendChild(ctx.el('p', { class: 'muted', text: L.segmentation_how }));
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
      ctx.el('button', { type: 'button', on: { click: function () { halt(); ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: L.hear_question }),
      ctx.el('button', { type: 'button', on: { click: function () { halt(); ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: L.hear_word }),
    ]));
    ctx.root.appendChild(boxList);
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [playBoxes, clearBtn]));
    ctx.root.appendChild(tray);
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [checkBtn]));
    draw();
    return {
      reveal: function (correct) {
        halt();
        picked = null; errors = [];
        if (!correct) {
          // Show the right sounds in the boxes, using the tray's own chips.
          var used = [];
          for (var i = 0; i < n; i++) {
            var hit = -1;
            for (var ci = 0; ci < item.chips.length && hit < 0; ci++) {
              if (used.indexOf(ci) < 0 && norm(item.chips[ci].label) === norm(item.sounds[i])) hit = ci;
            }
            used.push(hit);
            boxes[i] = hit;
          }
        }
        draw();
        boxEls.forEach(function (btn) { btn.style.borderColor = 'var(--ok)'; btn.style.background = 'var(--ok-bg)'; });
      },
    };
  },
};
