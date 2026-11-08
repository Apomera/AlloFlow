// Take-home adapter: Letter Trace (letter_tracing).
// App source of truth (word_sounds_module.js):
//   board       activityItems.letter_tracing = { letter: word[0] } (setup), and the
//               player traces the word's first letter; a board copied from another
//               word is never used (the letter must be the word's first letter).
//   grading     none: letter_tracing is in WS_NON_GRADED_ACTIVITIES, so the file
//               records it as practice ("traced" or "skipped"), never right or wrong.
//   access      pointer events cover mouse, touch and pen; "Skip (not traced)" is the
//               path for a student who cannot trace (2026-11-07 parity audit).
module.exports = {
  id: 'letter_tracing',
  title: 'Letter Trace',
  labels: {
    letter_tracing_question: 'Trace the letter {letter} with your finger, a pen or the mouse.',
    letter_tracing_canvas: 'Tracing area for the letter {letter}',
    letter_tracing_done: 'I traced it',
    letter_tracing_clear: 'Start again',
    letter_tracing_skip: 'Skip (not traced)',
    letter_tracing_more: 'Keep going. Trace over more of the letter.',
    letter_tracing_stay: 'Stay on the letter. Press Start again and trace inside its shape.',
    letter_tracing_traced: 'Nice tracing!',
    letter_tracing_skipped: 'Skipped. That is fine.',
  },
  prepare: function (w, env) {
    var word = String((w && (w.targetWord || w.word || w.term)) || '').trim();
    var first = Array.from(word)[0] || '';
    var board = w && w.activityItems && w.activityItems.letter_tracing;
    var letter = String((board && board.letter) || first).trim();
    if (!letter || !first || Array.from(letter).length !== 1 || letter.toLowerCase() !== first.toLowerCase()) return { missing: ['board'] };
    // Tracing is visual: the spoken instruction and the word are helpful, not required.
    var wordAudio = env.wordClip(word);
    var prompt = env.bankClip('instructions', 'inst_letter_tracing');
    var intro = [];
    if (prompt) intro.push(prompt);
    if (wordAudio) intro.push(wordAudio);
    return { item: { target: letter.toLowerCase(), letter: letter, wordAudio: wordAudio, promptAudio: prompt,
      introAudio: intro, answerAudio: wordAudio ? [wordAudio] : [] } };
  },
  render: function (item, ctx) {
    var L = ctx.L;
    var doc = ctx.root.ownerDocument;
    var size = 280;
    var wrap = ctx.el('div', { style: 'position:relative;width:' + size + 'px;height:' + size + 'px;max-width:100%;margin:12px auto;border:2px dashed var(--muted);border-radius:16px;touch-action:none' });
    var guide = doc.createElement('canvas');
    var pen = doc.createElement('canvas');
    [guide, pen].forEach(function (c) {
      c.width = size; c.height = size;
      c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;touch-action:none';
      wrap.appendChild(c);
    });
    pen.setAttribute('role', 'img');
    pen.setAttribute('aria-label', ctx.fmt(L.letter_tracing_canvas, { letter: item.letter }));
    var font = 'bold ' + Math.round(size * 0.78) + 'px system-ui, sans-serif';
    var paint = function (g, color) {
      g.clearRect(0, 0, size, size);
      g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(item.letter, size / 2, size * 0.54);
    };
    var gg = guide.getContext ? guide.getContext('2d') : null;
    var pg = pen.getContext ? pen.getContext('2d') : null;
    if (gg) paint(gg, 'rgba(100,116,139,0.35)');
    var drawing = false, last = null;
    var at = function (e) {
      var r = pen.getBoundingClientRect();
      return { x: (e.clientX - r.left) * size / (r.width || size), y: (e.clientY - r.top) * size / (r.height || size) };
    };
    var line = function (a, b) {
      if (!pg) return;
      pg.strokeStyle = '#1d4ed8'; pg.lineWidth = size * 0.08; pg.lineCap = 'round'; pg.lineJoin = 'round';
      pg.beginPath(); pg.moveTo(a.x, a.y); pg.lineTo(b.x, b.y); pg.stroke();
    };
    pen.addEventListener('pointerdown', function (e) {
      if (ctx.isDone()) return;
      drawing = true; last = at(e); line(last, last);
      try { pen.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    pen.addEventListener('pointermove', function (e) {
      if (!drawing) return;
      var p = at(e); line(last, p); last = p; e.preventDefault();
    });
    var stop = function () { drawing = false; last = null; };
    pen.addEventListener('pointerup', stop);
    pen.addEventListener('pointercancel', stop);
    // How much of the letter the strokes cover, and how much ink lands well away from it
    // (scribbling over the whole box is not tracing). Every 4th pixel is enough.
    var measure = function () {
      if (!gg || !pg) return { cover: 1, stray: 0 };
      var mask = doc.createElement('canvas'); mask.width = size; mask.height = size;
      var mg = mask.getContext('2d'); paint(mg, '#000');
      var halo = doc.createElement('canvas'); halo.width = size; halo.height = size;
      var hg = halo.getContext('2d'); paint(hg, '#000');
      hg.lineWidth = size * 0.14; hg.lineJoin = 'round'; hg.strokeStyle = '#000'; hg.strokeText(item.letter, size / 2, size * 0.54);
      var m = mg.getImageData(0, 0, size, size).data, hd = hg.getImageData(0, 0, size, size).data, p = pg.getImageData(0, 0, size, size).data;
      var inside = 0, covered = 0, ink = 0, away = 0;
      for (var i = 3; i < m.length; i += 16) {
        if (m[i] > 128) { inside++; if (p[i] > 0) covered++; }
        if (p[i] > 0) { ink++; if (hd[i] <= 128) away++; }
      }
      return { cover: inside ? covered / inside : 0, stray: ink ? away / ink : 0 };
    };
    var note = ctx.el('p', { class: 'letters', 'aria-live': 'polite' });
    var hear = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio || item.promptAudio); } }, text: ctx.L.hear_word });
    var done = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () {
      if (ctx.isDone()) return;
      var m = measure();
      if (m.stray > 0.5) { note.textContent = L.letter_tracing_stay; return; }
      if (m.cover < 0.45) { note.textContent = L.letter_tracing_more; return; }
      note.textContent = '';
      ctx.practice('traced', L.letter_tracing_traced);
    } }, text: L.letter_tracing_done });
    var clear = ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; if (pg) pg.clearRect(0, 0, size, size); note.textContent = ''; } }, text: L.letter_tracing_clear });
    var skip = ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; ctx.practice('skipped', L.letter_tracing_skipped); } }, text: L.letter_tracing_skip });
    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.fmt(L.letter_tracing_question, { letter: item.letter }) }));
    if (item.wordAudio || item.promptAudio) ctx.root.appendChild(ctx.el('div', { class: 'row' }, [hear]));
    ctx.root.appendChild(wrap);
    ctx.root.appendChild(note);
    ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'margin-top:12px' }, [done, clear, skip]));
    return {
      reveal: function () { [done, clear, skip].forEach(function (b) { b.setAttribute('aria-disabled', 'true'); }); },
    };
  },
};
