// Take-home adapter: Word Scramble (word_scramble).
// App source of truth:
//   board   compileActivityItems (word_sounds_setup_source.jsx:4684-4689, 4811):
//           { letters: the word's letters in a seeded shuffle that never equals the
//           word, answer: word }. Without a board the view scrambles the word with
//           the same seeded loop (scrambleWord, word_sounds_module.js:18916-18934).
//   view    case "word_scramble" (word_sounds_module.js:19874-20027): letter tiles
//           (tap adds the letter to the answer, a used tile is disabled), one answer
//           box per letter, Clear, Check (enabled once the answer is not empty),
//           "Play word", and a "Show word" support (:18774-18789; the word is
//           otherwise hidden until answered, SMART_TEXT_VISIBILITY :7568).
//   grading submitConstructionAnswer (:18887-18902): trimmed, lowercased answer
//           === trimmed, lowercased word; the same unchanged answer is not graded
//           twice; checkAnswer("correct"|"incorrect","correct"). Default budget 2
//           tries (:17130). A first miss clears the answer and frees every tile
//           (checkScramble :19875-19880).
//   audio   inst_word_scramble (INST_KEY_MAP :16449); the word only on request.
module.exports = {
  id: 'word_scramble',
  title: 'Word Scramble',
  labels: {
    word_scramble_question: 'Unscramble the letters to make the word.',
    word_scramble_how: 'Tap a letter to pick it up, then tap a box to put it there. Tap a filled box to take the letter out.',
    word_scramble_tray: 'Letters',
    word_scramble_boxes: 'Answer boxes',
    word_scramble_box_empty: 'Box {n}, empty',
    word_scramble_box_filled: 'Box {n}: {letter}',
    word_scramble_pick: 'Pick up {letter}',
    word_scramble_picked: '{letter} picked up. Now choose a box.',
    word_scramble_dropped: '{letter} put back.',
    word_scramble_placed: '{letter} is in box {n}.',
    word_scramble_removed: '{letter} taken out of box {n}.',
    word_scramble_cleared: 'All the boxes are empty again.',
    word_scramble_clear: 'Clear',
    word_scramble_check: 'Check',
    word_scramble_show_word: 'Show word',
    word_scramble_word: 'The word: {word}',
    word_scramble_empty: 'Put some letters in the boxes first.',
    word_scramble_same: 'Change your answer, then check it again.',
    word_scramble_retry: 'Not quite. The letters are back. Listen and try once more.',
    word_scramble_correct: 'Yes! The word is {word}.',
    word_scramble_missed: 'The word is {word}. Listen.',
  },
  prepare: function (w, env) {
    var word = String(env.word || '').trim().toLowerCase();
    if (!word) return { missing: ['word'] };
    var board = w && w.activityItems && w.activityItems.word_scramble;
    var letters = board && Array.isArray(board.letters) ? board.letters.map(function (l) { return String(l).toLowerCase(); }) : null;
    // The board must be exactly this word's letters (one tile per letter).
    if (letters && letters.slice().sort().join('\u0000') !== word.split('').sort().join('\u0000')) return { missing: ['board'] };
    if (!letters) {
      // scrambleWord (word_sounds_module.js:18916-18928), copied exactly.
      letters = word.split('');
      if (word.length > 2) {
        var seed = word.split('').reduce(function (a, c) { return a + c.charCodeAt(0); }, 0);
        for (var i = letters.length - 1; i > 0; i--) { var j = (seed + i) % (i + 1); var t = letters[i]; letters[i] = letters[j]; letters[j] = t; }
        if (letters.join('') === word) { var t2 = letters[0]; letters[0] = letters[1]; letters[1] = t2; }
      }
    }
    var missing = [];
    var wordAudio = env.wordClip(env.word);
    if (!wordAudio) missing.push('word');
    var prompt = env.bankClip('instructions', 'inst_word_scramble');
    if (!prompt) missing.push('question');
    if (missing.length) return { missing: missing };
    return { item: { target: word, letters: letters, wordAudio: wordAudio, promptAudio: prompt,
      introAudio: [prompt], answerAudio: [wordAudio] } };
  },
  render: function (item, ctx) {
    var L = ctx.L;
    var n = item.target.length;
    var boxes = [];
    for (var s = 0; s < n; s++) boxes.push(null);
    var picked = null;
    var lastSubmitted = null;
    var locked = function () { return ctx.isDone(); };
    var up = function (ti) { return String(item.letters[ti]).toUpperCase(); };
    var answerText = function () { return boxes.filter(function (x) { return x != null; }).map(function (ti) { return item.letters[ti]; }).join(''); };

    var tray = ctx.el('ul', { class: 'row', 'aria-label': L.word_scramble_tray, style: 'list-style:none;padding:0;margin:16px 0;gap:10px' });
    var tiles = item.letters.map(function (letter, ti) {
      var btn = ctx.el('button', { type: 'button', class: 'primary', 'aria-pressed': 'false', 'aria-label': ctx.fmt(L.word_scramble_pick, { letter: up(ti) }),
        style: 'min-width:56px;min-height:56px;font-size:1.5rem;font-weight:700',
        on: { click: function () { onTile(ti); } } }, [up(ti)]);
      var li = ctx.el('li', {}, [btn]);
      tray.appendChild(li);
      return { li: li, btn: btn };
    });
    var boxList = ctx.el('ol', { class: 'slots', 'aria-label': L.word_scramble_boxes });
    var boxEls = boxes.map(function (_, bi) {
      var btn = ctx.el('button', { type: 'button', class: 'slot', style: 'min-width:60px;min-height:64px;font-size:1.5rem;font-weight:700',
        on: { click: function () { onBox(bi); } } });
      boxList.appendChild(ctx.el('li', {}, [btn]));
      return btn;
    });
    var wordLine = ctx.el('p', { class: 'letters', hidden: true, text: ctx.fmt(L.word_scramble_word, { word: item.target }) });
    var showWord = ctx.el('button', { type: 'button', 'aria-pressed': 'false', on: { click: function () {
      if (locked()) return;
      var on = wordLine.hidden;
      if (on) ctx.support('wordShown');
      wordLine.hidden = !on;
      showWord.setAttribute('aria-pressed', on ? 'true' : 'false');
    } }, text: L.word_scramble_show_word });
    var clearAll = function () { picked = null; for (var i = 0; i < n; i++) boxes[i] = null; };
    var clearBtn = ctx.el('button', { type: 'button', on: { click: function () {
      if (locked()) return;
      clearAll(); lastSubmitted = null; draw(); ctx.announce(L.word_scramble_cleared);
    } }, text: L.word_scramble_clear });
    var checkBtn = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { onCheck(); } }, text: L.word_scramble_check });

    var draw = function () {
      tiles.forEach(function (t, ti) {
        t.li.hidden = boxes.indexOf(ti) >= 0;
        t.btn.setAttribute('aria-pressed', picked === ti ? 'true' : 'false');
        if (locked()) t.btn.setAttribute('aria-disabled', 'true');
      });
      boxEls.forEach(function (btn, bi) {
        var ti = boxes[bi];
        btn.textContent = ti == null ? '' : up(ti);
        btn.style.borderStyle = ti == null ? 'dashed' : 'solid';
        btn.style.borderColor = ti == null ? 'var(--muted)' : 'var(--accent)';
        btn.setAttribute('aria-label', ti == null ? ctx.fmt(L.word_scramble_box_empty, { n: bi + 1 }) : ctx.fmt(L.word_scramble_box_filled, { n: bi + 1, letter: up(ti) }));
        if (locked()) btn.setAttribute('aria-disabled', 'true');
      });
      checkBtn.setAttribute('aria-disabled', locked() || !answerText() ? 'true' : 'false');
      if (locked()) { clearBtn.setAttribute('aria-disabled', 'true'); showWord.setAttribute('aria-disabled', 'true'); }
    };
    var onTile = function (ti) {
      if (locked() || boxes.indexOf(ti) >= 0) return;
      if (picked === ti) { picked = null; draw(); ctx.announce(ctx.fmt(L.word_scramble_dropped, { letter: up(ti) })); return; }
      picked = ti;
      draw();
      ctx.announce(ctx.fmt(L.word_scramble_picked, { letter: up(ti) }));
      var empty = boxes.indexOf(null);
      boxEls[empty >= 0 ? empty : 0].focus();
    };
    var onBox = function (bi) {
      if (locked()) return;
      if (picked == null) {
        var out = boxes[bi];
        if (out == null) { ctx.announce(L.word_scramble_how); return; }
        boxes[bi] = null; lastSubmitted = null;
        draw();
        ctx.announce(ctx.fmt(L.word_scramble_removed, { letter: up(out), n: bi + 1 }));
        return;
      }
      var ti = picked;
      picked = null;
      boxes[bi] = ti; lastSubmitted = null;
      draw();
      ctx.announce(ctx.fmt(L.word_scramble_placed, { letter: up(ti), n: bi + 1 }));
      if (boxes.indexOf(null) < 0) { checkBtn.focus(); return; }
      for (var k = 0; k < tiles.length; k++) if (boxes.indexOf(k) < 0) { tiles[k].btn.focus(); return; }
    };
    var onCheck = function () {
      if (locked()) return;
      var answer = answerText().trim().toLowerCase();
      if (!answer) { ctx.announce(L.word_scramble_empty); return; }
      if (answer === lastSubmitted) { ctx.announce(L.word_scramble_same); return; }
      lastSubmitted = answer;
      var outcome = ctx.answer(answer, answer === String(item.target).trim().toLowerCase(), {
        correctText: ctx.fmt(L.word_scramble_correct, { word: item.target }),
        retryText: L.word_scramble_retry,
        missedText: ctx.fmt(L.word_scramble_missed, { word: item.target }),
      });
      // A first miss clears the answer and frees every tile (checkScramble).
      if (outcome === 'retry') { clearAll(); draw(); if (tiles[0]) tiles[0].btn.focus(); }
    };

    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: L.word_scramble_question }));
    ctx.root.appendChild(ctx.el('p', { class: 'muted', text: L.word_scramble_how }));
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: L.hear_question }),
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: L.hear_word }),
      showWord,
    ]));
    ctx.root.appendChild(wordLine);
    ctx.root.appendChild(tray);
    ctx.root.appendChild(boxList);
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [clearBtn, checkBtn]));
    draw();
    return {
      reveal: function (correct) {
        picked = null;
        if (!correct) {
          var used = [];
          for (var i = 0; i < n; i++) {
            var hit = -1;
            for (var ti = 0; ti < item.letters.length && hit < 0; ti++) if (used.indexOf(ti) < 0 && item.letters[ti] === item.target[i]) hit = ti;
            used.push(hit);
            boxes[i] = hit < 0 ? null : hit;
          }
        }
        wordLine.hidden = false;
        draw();
        boxEls.forEach(function (btn) { btn.style.borderColor = 'var(--ok)'; btn.style.background = 'var(--ok-bg)'; });
      },
    };
  },
};
