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
// 2026-11-13 (answer audit): ir and ur are the sound of er (the dictionary spells it three ways: murder is m ur d er),
// so the two chips of one sound go in either box; before, only one order was right.
// 2026-11-13: each tray chip had Listen first, then the sound to pick up (as every Listen +
// Choose pair). 2026-11-18: no Listen here any more (see render): picking a tile up plays it
// and commits nothing, as in the app. With letters on, a sound whose label is not letters
// shows a name (ctx.sound: oo_short -> "short oo (book)"), else /a/.
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
    var MAP = { 'ā': 'ay', 'ē': 'ee', 'ī': 'ie', 'ō': 'oa', 'ū': 'oo', 'ă': 'a', 'ĕ': 'e', 'ĭ': 'i', 'ŏ': 'o', 'ŭ': 'u', oi: 'oy', aw: 'au', ew: 'oo', oe: 'oa', ir: 'er', ur: 'er' };
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
  // 2026-11-18 (owner: a first-time player got stuck here): the app's look, with Packets' words. Each sound is a round
  // colored tile (its letters, or a speaker), side by side, so the tiles and the boxes fit one phone screen; a filled
  // box takes its tile's color; an empty box shows where a sound goes. Tap a tile to hear it and hold it (it lifts and
  // the empty boxes light up), then tap a box, or drag the tile there with a mouse, a finger or a pen. A box's sound
  // can be dragged to another box or back to the tiles. What each move did is shown under the boxes as well as said.
  // A tile has no Listen button of its own: picking it up plays it and changes nothing until it is put in a box.
  render: function (item, ctx) {
    var doc = ctx.root.ownerDocument, win = doc.defaultView;
    var L = ctx.L;
    // word_sounds_module.js:19317-19336, copied exactly.
    var MAP = { 'ā': 'ay', 'ē': 'ee', 'ī': 'ie', 'ō': 'oa', 'ū': 'oo', 'ă': 'a', 'ĕ': 'e', 'ĭ': 'i', 'ŏ': 'o', 'ŭ': 'u', oi: 'oy', aw: 'au', ew: 'oo', oe: 'oa', ir: 'er', ur: 'er' };
    var norm = function (p) { var l = String(p || '').toLowerCase().trim(); return Object.prototype.hasOwnProperty.call(MAP, l) ? MAP[l] : l; };
    var n = item.sounds.length;
    var boxes = [];
    for (var b = 0; b < n; b++) boxes.push(null);
    var picked = null;
    var errors = [];
    var token = 0;
    // With letters on, a sound like oo_short shows its friendly name (ctx.sound).
    var said = function (label) { return typeof ctx.sound === 'function' ? ctx.sound(label) : '/' + label + '/'; };
    var name = function (ci) { return ctx.showLetters ? said(item.chips[ci].label) : ctx.fmt(L.sound_n, { n: ci + 1 }); };
    var locked = function () { return ctx.isDone(); };
    var halt = function () { token++; };

    // Theme-driven tiles (2026-11-19): follow every Reading Tools color theme (Default, High Contrast, Soft, Dark,
    // Ocean, Sunny, Forest) and forced-colors via CSS variables, never hardcoded light-only fills or dark ink.
    var still = !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
    // A "goes here" arrow (a character), and a speaker drawn with borders in the tile's own ink, so it is as dark as the
    // letters (an emoji speaker is pale grey on most devices). No drawing element: a file carries none.
    var icon = function (kind) {
      if (kind === 'drop') return ctx.el('span', { 'aria-hidden': 'true', 'data-seg-icon': 'drop', text: '↓', style: 'display:block;line-height:1;pointer-events:none;font-size:1.7rem;font-weight:800' });
      var part = function (css) { return ctx.el('span', { style: 'position:absolute;display:block;box-sizing:border-box;' + css }); };
      var arc = 'border:2.5px solid;border-color:transparent currentColor transparent transparent;border-radius:50%;';
      return ctx.el('span', { 'aria-hidden': 'true', 'data-seg-icon': 'sound', style: 'position:relative;display:block;width:28px;height:24px;pointer-events:none' }, [
        part('left:2px;top:8px;width:7px;height:8px;background:currentColor;border-radius:1px'),
        part('left:5px;top:3px;width:0;height:0;border-style:solid;border-width:9px 9px 9px 0;border-color:transparent currentColor transparent transparent'),
        part(arc + 'left:10px;top:7px;width:10px;height:10px'),
        part(arc + 'left:9px;top:3px;width:18px;height:18px'),
      ]);
    };
    // What a tile, or a box holding it, shows: its letters, or a speaker.
    var face = function (node, ci) {
      node.textContent = '';
      if (ctx.showLetters) node.appendChild(doc.createTextNode(name(ci))); else node.appendChild(icon('sound'));
    };
    var tileStyle = function () {
      return (ctx.showLetters ? 'min-width:64px;height:58px;padding:0 16px;border-radius:999px;' : 'width:64px;height:64px;padding:0;border-radius:50%;')
        + 'display:flex;align-items:center;justify-content:center;font-size:1.25rem;font-weight:800;color:var(--ink);touch-action:none;'
        + 'background:var(--soft);border:3px solid var(--accent);box-shadow:0 3px 0 var(--accent)'
        + (still ? '' : ';transition:transform .12s ease,box-shadow .12s ease');
    };
    // The line under the boxes: what the last move did (also said through ctx.announce).
    var say = ctx.el('p', { class: 'muted', 'data-seg-say': '', style: 'min-height:1.5em;margin:4px 0 0;text-align:center;font-weight:600' });
    var tell = function (text) { say.textContent = text; ctx.announce(text); };
    // A click the keyboard made (detail 0) moves the focus on, as before; a tap leaves it, so the page does not jump.
    var byKey = function (e) { return !e || e.detail === 0; };
    var tray = ctx.el('ul', { class: 'row', 'data-seg-tray': '', 'aria-label': L.segmentation_tray, style: 'list-style:none;padding:6px 0;margin:8px 0;gap:12px;justify-content:center' });
    var chipEls = item.chips.map(function (chip, ci) {
      var pick = ctx.el('button', { type: 'button', class: 'primary', 'aria-pressed': 'false', 'data-seg-tile': String(ci),
        'aria-label': ctx.fmt(L.segmentation_pick, { sound: name(ci) }), style: tileStyle(),
        on: { click: function (e) { if (dragged()) return; onChip(ci, e); }, pointerdown: function (e) { dragStart(e, ci, 'tray', -1); } } });
      face(pick, ci);
      var li = ctx.el('li', {}, [pick]);
      tray.appendChild(li);
      return { li: li, pick: pick };
    });
    var boxList = ctx.el('ol', { class: 'slots', dir: 'ltr', 'aria-label': L.segmentation_boxes, style: 'justify-content:center;margin:12px 0 0' });
    var boxEls = boxes.map(function (_, bi) {
      var btn = ctx.el('button', { type: 'button', class: 'slot', 'data-seg-box': String(bi), style: 'min-width:76px;min-height:76px;border-width:3px;border-radius:16px;font-size:1.25rem;font-weight:800',
        on: { click: function (e) { if (dragged()) return; onBox(bi, e); }, pointerdown: function (e) { if (boxes[bi] != null) dragStart(e, boxes[bi], 'box', bi); } } });
      boxList.appendChild(ctx.el('li', {}, [btn]));
      return btn;
    });
    // Dragging, with a mouse, a finger or a pen: a short move is still a tap.
    var drag = null, dragEndedAt = 0;
    var dragged = function () { return Date.now() - dragEndedAt < 400; };
    var dragStart = function (e, ci, from, bi) {
      if (locked() || e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { ci: ci, from: from, bi: bi, x: e.clientX, y: e.clientY, src: e.currentTarget, ghost: null };
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
        halt();
        var g = drag.src.cloneNode(true);
        ['data-seg-tile', 'data-seg-box', 'aria-label', 'aria-pressed'].forEach(function (a) { g.removeAttribute(a); });
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
      if (!d.ghost) return; // a tap: its click does the rest
      if (d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
      dragEndedAt = Date.now();
      var at = e.type === 'pointercancel' ? null : doc.elementFromPoint(e.clientX, e.clientY);
      var box = at && at.closest ? at.closest('[data-seg-box]') : null;
      var back = at && at.closest ? at.closest('[data-seg-tray]') : null;
      if (box && ctx.root.contains(box)) {
        var to = Number(box.getAttribute('data-seg-box'));
        if (d.from === 'tray') placeAt(d.ci, to);
        else if (to !== d.bi) { var other = boxes[to]; boxes[to] = d.ci; boxes[d.bi] = other; errors = []; draw(); ctx.play(item.chips[d.ci].audio); tell(ctx.fmt(L.segmentation_placed, { sound: name(d.ci), n: to + 1 })); }
      } else if (back && d.from === 'box') {
        boxes[d.bi] = null; errors = []; draw(); tell(ctx.fmt(L.segmentation_removed, { sound: name(d.ci), n: d.bi + 1 }));
      } else if (d.from === 'tray') { picked = null; draw(); }
    };
    var checkBtn = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { onCheck(); } }, text: L.segmentation_check });
    var clearBtn = ctx.el('button', { type: 'button', on: { click: function () {
      if (locked()) return;
      halt(); picked = null; errors = [];
      for (var i = 0; i < n; i++) boxes[i] = null;
      draw(); tell(L.segmentation_cleared);
    } }, text: L.segmentation_clear });
    // "Test Sequence" (:18795-18815): each box's sound spaced by ctx.soundGap() (500/800/250 ms); +100 ms for an empty box.
    var playBoxes = ctx.el('button', { type: 'button', on: { click: function () {
      ctx.support('sequenceReplays');
      var mine = ++token, i = 0;
      var step = function () {
        if (mine !== token || !ctx.root.isConnected || i >= n) return;
        var gap = typeof ctx.soundGap === 'function' ? ctx.soundGap() : 500;
        var ci = boxes[i++];
        if (ci == null) { win.setTimeout(step, gap + 100); return; }
        ctx.play(item.chips[ci].audio).then(function () { if (mine === token) win.setTimeout(step, gap); });
      };
      step();
    } }, text: L.segmentation_play_boxes });

    var draw = function () {
      var full = boxes.every(function (x) { return x != null; });
      var holding = picked != null && !locked();
      chipEls.forEach(function (c, ci) {
        c.li.hidden = boxes.indexOf(ci) >= 0;
        var on = picked === ci;
        c.pick.setAttribute('aria-pressed', on ? 'true' : 'false');
        // Held: it lifts and flips to the theme accent fill/ink with a ring in the accent color.
        c.pick.style.background = on ? 'var(--accent)' : 'var(--soft)';
        c.pick.style.color = on ? 'var(--accent-ink)' : 'var(--ink)';
        c.pick.style.borderColor = 'var(--accent)';
        c.pick.style.transform = on ? 'translateY(-6px) scale(1.08)' : '';
        c.pick.style.boxShadow = on ? '0 0 0 3px var(--card), 0 0 0 7px var(--accent)' : '0 3px 0 var(--accent)';
        if (locked()) c.pick.setAttribute('aria-disabled', 'true');
      });
      boxEls.forEach(function (btn, bi) {
        var ci = boxes[bi];
        var bad = errors.indexOf(bi) >= 0 && ci != null;
        if (ci == null) { btn.textContent = ''; btn.appendChild(icon('drop')); } else face(btn, ci);
        btn.style.borderStyle = ci == null ? 'dashed' : 'solid';
        btn.style.borderColor = bad ? 'var(--warn)' : ci == null ? (holding ? 'var(--accent)' : 'var(--muted)') : 'var(--accent)';
        btn.style.background = bad ? 'var(--warn-bg)' : ci == null ? (holding ? 'var(--soft)' : '') : 'var(--soft)';
        btn.style.color = bad ? 'var(--warn)' : ci == null ? (holding ? 'var(--accent)' : 'var(--muted)') : 'var(--ink)';
        // While a tile is held, the empty boxes light up: that is where it can go.
        btn.style.boxShadow = holding && ci == null ? '0 0 0 3px var(--accent)' : '';
        btn.style.touchAction = ci == null ? 'manipulation' : 'none';
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
    // A tray tile into box bi (a sound already there goes back to the tiles).
    var placeAt = function (ci, bi) {
      picked = null; errors = [];
      boxes[bi] = ci;
      draw();
      ctx.play(item.chips[ci].audio);
      tell(ctx.fmt(L.segmentation_placed, { sound: name(ci), n: bi + 1 }));
    };
    var onChip = function (ci, e) {
      if (locked() || boxes.indexOf(ci) >= 0) return;
      halt();
      if (picked === ci) { picked = null; draw(); tell(ctx.fmt(L.segmentation_dropped, { sound: name(ci) })); return; }
      picked = ci;
      draw();
      ctx.play(item.chips[ci].audio);
      tell(ctx.fmt(L.segmentation_picked, { sound: name(ci) }));
      // Keyboard path: go straight to the first empty box.
      var empty = boxes.indexOf(null);
      if (byKey(e)) boxEls[empty >= 0 ? empty : 0].focus();
    };
    var onBox = function (bi, e) {
      if (locked()) return;
      halt();
      errors = [];
      if (picked == null) {
        var out = boxes[bi];
        if (out == null) { tell(L.segmentation_how); return; }
        boxes[bi] = null;
        draw();
        tell(ctx.fmt(L.segmentation_removed, { sound: name(out), n: bi + 1 }));
        return;
      }
      placeAt(picked, bi);
      if (byKey(e)) nextFocus().focus();
    };
    var onCheck = function () {
      if (locked()) return;
      if (boxes.some(function (x) { return x == null; })) { tell(L.segmentation_fill_first); return; }
      say.textContent = '';
      halt();
      var bad = [];
      boxes.forEach(function (ci, i) { if (norm(item.chips[ci].label) !== norm(item.sounds[i])) bad.push(i); });
      var response = boxes.map(function (ci) { return item.chips[ci].label; }).join(' ');
      var outcome = ctx.answer(response, bad.length === 0, {
        correctText: L.segmentation_correct,
        retryText: L.segmentation_retry,
        missedText: ctx.showLetters ? ctx.fmt(L.segmentation_missed, { sounds: item.sounds.map(said).join(' ') })
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
    // Top to bottom: the boxes, what the last move did, the tiles, then Check with the two box buttons, so the boxes,
    // the tiles and Check are close together (on a phone, on one screen).
    ctx.root.appendChild(boxList);
    ctx.root.appendChild(say);
    // Hear all (the player's ctx.hearAll): each sound still in the tray, in turn, marked with its number.
    var hear = typeof ctx.hearAll === 'function' ? ctx.hearAll({ before: halt, ready: function () { return !locked(); },
      list: function () { return chipEls.map(function (c, ci) { return c.li.hidden ? null : { box: c.li, n: ci + 1, total: chipEls.length, say: function () { return ctx.play(item.chips[ci].audio); } }; }); } }) : null;
    ctx.root.appendChild(tray);
    if (hear) ctx.root.appendChild(hear.node);
    ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'justify-content:center' }, [checkBtn, playBoxes, clearBtn]));
    draw();
    return {
      reveal: function (correct) {
        halt();
        picked = null; errors = [];
        say.textContent = '';
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
        boxEls.forEach(function (btn) {
          btn.style.borderColor = 'var(--ok)';
          btn.style.background = 'var(--ok-bg)';
          btn.style.color = 'var(--ok)';
          btn.style.boxShadow = '';
        });
      },
    };
  },
};
