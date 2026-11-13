// Practice and check adapter: Picture to word (vocab_picture_word). "Which word goes with this picture?": one
// picture is shown, the choices are words. It is vocab_picture.js apart from its id, its title and its words: see
// the notes there.
module.exports = {
  id: 'vocab_picture_word',
  title: 'Picture to word',
  labels: {
    vocab_picture_word_intro: 'Look at each picture. Choose the word that goes with it.',
    vocab_picture_word_directions: 'Look at the picture. Choose the word that goes with it.',
    vocab_picture_word_question: 'Which word goes with this picture?',
    vocab_picture_word_read: 'Read aloud',
    vocab_picture_word_read_choice: 'Read choice {n} aloud',
    vocab_picture_word_hear: 'Hear it',
    vocab_picture_word_picture: 'Picture {n}',
    vocab_picture_word_picture_of: 'Picture {n}: {word}',
    vocab_picture_word_correct: 'Yes. That is the word.',
    vocab_picture_word_retry: 'Not quite. Try once more.',
    vocab_picture_word_missed: 'Here is the right answer.',
    vocab_picture_word_practice_wrong: 'Not quite. Here is the right answer.',
  },
  // p: { word, ask, image (Picture to word), choices: [{ text, image, audio }], answer, read, lang, askAudio }
  prepare: function (p) {
    p = p || {};
    var line = function (v, max) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''; };
    var id = function (v) { return typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : ''; };
    var word = line(p.word, 300), ask = line(p.ask, 300);
    if (!word || !ask) return { missing: ['word'] };
    if (!Array.isArray(p.choices) || p.choices.length < 2 || p.choices.length > 6) return { missing: ['choices'] };
    var given = p.choices.map(function (c) { return c && typeof c === 'object' ? c : { text: c }; });
    var texts = given.map(function (c) { return line(c.text, 60); });
    var keys = texts.map(function (t) { return t.slice(0, 80).toLowerCase(); });
    if (texts.some(function (t) { return !t; }) || keys.some(function (k, i) { return keys.indexOf(k) !== i; })) return { missing: ['different choices'] };
    var image = id(p.image);
    // Each choice is a picture (Word to picture), or the question is (Picture to word): never both, never neither.
    var pictures = given.map(function (c) { return id(c.image); });
    var pictured = pictures.every(Boolean);
    if (pictured === !!image || (!pictured && pictures.some(Boolean))) return { missing: ['pictures'] };
    if (pictured && pictures.some(function (x, i) { return pictures.indexOf(x) !== i; })) return { missing: ['different pictures'] };
    var answer = line(p.answer, 60).slice(0, 80);
    if (!answer || texts.map(function (t) { return t.slice(0, 80); }).indexOf(answer) < 0) return { missing: ['an answer that is one of the choices'] };
    var lang = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(String(p.lang || '')) ? String(p.lang) : 'en';
    var item = { word: word, ask: ask, choices: given.map(function (c, i) {
      var out = { text: texts[i] };
      if (pictured) out.image = pictures[i];
      if (id(c.audio)) out.audio = id(c.audio);
      return out;
    }), answer: answer, read: p.read === true, lang: lang };
    if (image) item.image = image;
    if (id(p.askAudio)) item.askAudio = id(p.askAudio);
    return { item: item };
  },
  render: function (item, ctx) {
    var P = 'vocab_picture_word_';
    var L = ctx.L;
    var doc = ctx.root.ownerDocument;
    var view = doc && doc.defaultView;
    var synth = item.read && view && view.speechSynthesis && typeof view.SpeechSynthesisUtterance === 'function' ? view.speechSynthesis : null;
    var lang = String(item.lang || 'en').toLowerCase();
    var pictured = !item.image;
    var voice = function () {
      var all = [];
      try { all = synth.getVoices() || []; } catch (_) { all = []; }
      var local = all.filter(function (v) { return v && v.localService === true; });
      var match = function (v) { return String(v.lang || '').toLowerCase().replace('_', '-'); };
      return local.filter(function (v) { return match(v) === lang || match(v).indexOf(lang + '-') === 0; })[0] || null;
    };
    if (synth) { try { synth.cancel(); synth.getVoices(); } catch (_) {} }
    var readers = [];
    var say = function (text) {
      return new Promise(function (resolve) {
        var v = synth ? voice() : null;
        if (!v) { resolve(false); return; }
        var over = false, end = function () { if (!over) { over = true; resolve(true); } };
        try {
          synth.cancel();
          var u = new view.SpeechSynthesisUtterance(text);
          u.voice = v; u.lang = v.lang; u.rate = 0.9;
          u.onend = end; u.onerror = end;
          synth.speak(u);
        } catch (_) { end(); }
        view.setTimeout(end, 2000 + String(text).length * 130);
      });
    };
    var wake = function () { if (!synth || !voice()) return; try { var u = new view.SpeechSynthesisUtterance(''); u.volume = 0; synth.speak(u); } catch (_) {} };
    var hush = function () { if (synth) { try { synth.cancel(); } catch (_) {} } };
    var sayChoice = function (c) { return c.audio ? ctx.play(c.audio) : say(c.text); };
    // Word to picture: the word (its clip, or the device voice), then the question. Picture to word: the question.
    var sayAsk = function () {
      var question = L[P + 'question'];
      if (!pictured) return say(question);
      if (item.askAudio) { wake(); return ctx.play(item.askAudio).then(function () { return say(question); }); }
      return say(item.ask + '. ' + question);
    };
    var reader = function (run, attrs, label, clipped) {
      var b = ctx.el('button', Object.assign({ type: 'button', hidden: true, on: { click: function () { ctx.support('readAloud'); hush(); run(); } } }, attrs), [label]);
      readers.push({ b: b, clipped: !!clipped });
      return b;
    };
    var hear = null;
    var showReaders = function () {
      var on = !!(synth && voice());
      readers.forEach(function (r) { r.b.hidden = !item.read || !(on || r.clipped); });
      if (hear) hear.button.hidden = hear.note.hidden = !item.read || !(on || item.choices.every(function (c) { return !!c.audio; }));
    };
    var picture = function (src, size) {
      return ctx.el('img', { src: src || '', alt: '', style: 'display:block;margin:0 auto;width:' + size + 'px;height:' + size + 'px;max-width:100%;object-fit:contain;background:#fff;border-radius:10px;padding:6px' });
    };
    ctx.root.appendChild(ctx.el('p', { class: 'muted', style: 'margin:0', text: L[P + 'question'] }));
    if (pictured) ctx.root.appendChild(ctx.el('p', { class: 'letters', lang: item.lang || 'en', 'data-read': '', style: 'font-size:2rem;margin:8px 0', text: item.ask }));
    // The picture asked about is named only when the question is over.
    var shown = pictured ? null : picture(ctx.image(item.image), 180);
    if (shown) ctx.root.appendChild(ctx.el('div', { style: 'margin:8px 0' }, [shown]));
    var readRow = ctx.el('div', { class: 'row' }, [reader(sayAsk, { 'data-read-aloud': 'question' }, L[P + 'read'], pictured && !!item.askAudio)]);
    ctx.root.appendChild(readRow);
    var list = ctx.el('ul', { class: 'choices', style: pictured ? 'grid-template-columns:repeat(2,minmax(0,1fr))' : 'grid-template-columns:1fr' });
    var boxes = [], picks = [], tried = [];
    var lock = function () { picks.forEach(function (b) { b.setAttribute('aria-disabled', 'true'); }); };
    var pick = function (i) {
      if (ctx.isDone() || tried[i]) return;
      hush();
      var response = item.choices[i].text.slice(0, 80);
      if (ctx.check) {
        var said = ctx.answer(response);
        if (said !== 'ignored' && said !== 'time_up') { boxes[i].classList.add('picked'); lock(); }
        return;
      }
      var out = ctx.answer(response, response === item.answer, { correctText: L[P + 'correct'], retryText: L[P + 'retry'], missedText: L[P + 'missed'] });
      if (out === 'retry') { tried[i] = true; boxes[i].classList.add('tried'); picks[i].setAttribute('aria-disabled', 'true'); }
    };
    item.choices.forEach(function (c, i) {
      var number = ctx.el('span', { 'aria-hidden': 'true', style: 'font-weight:700;margin-inline-end:10px', text: String(i + 1) });
      var b = pictured
        ? ctx.el('button', { type: 'button', 'data-choice': String(i + 1), 'aria-label': ctx.fmt(L[P + 'picture'], { n: i + 1 }), style: 'flex:1 1 auto;width:100%;min-height:140px;padding:8px',
          on: { click: function () { pick(i); } } }, [number, picture(ctx.image(c.image), 120)])
        : ctx.el('button', { type: 'button', lang: item.lang || 'en', 'data-choice': String(i + 1), style: 'flex:1 1 auto;text-align:start;font-size:1.2rem;line-height:1.4;min-height:56px',
          on: { click: function () { pick(i); } } }, [number, c.text]);
      var box = ctx.el('li', { class: 'choice', style: pictured ? '' : 'flex-direction:row;align-items:center;flex-wrap:wrap' }, [b,
        pictured ? null : reader(function () { sayChoice(c); }, { 'data-read-aloud': 'choice-' + (i + 1), 'aria-label': ctx.fmt(L[P + 'read_choice'], { n: i + 1 }), style: 'min-height:48px;padding:6px 12px' }, L[P + 'hear'], !!c.audio)]);
      boxes.push(box); picks.push(b); tried.push(false);
      list.appendChild(box);
    });
    // Hear all reads word choices only: reading the words of picture choices would give the answer away.
    hear = !pictured && typeof ctx.hearAll === 'function' ? ctx.hearAll({ stop: hush, before: wake, ready: function () { return !hear.button.hidden && !ctx.isDone(); },
      list: function () { return item.choices.map(function (c, i) { return { box: boxes[i], say: function () { return sayChoice(c); } }; }); } }) : null;
    // In the row of Read aloud, so the buttons stay together.
    if (hear) { readRow.appendChild(hear.button); readRow.appendChild(hear.note); }
    ctx.root.appendChild(list);
    showReaders();
    if (synth) { try { if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', showReaders); } catch (_) {} }
    if (typeof ctx.keys === 'function') ctx.keys(function (key) {
      var n = Number(key);
      if (!(n >= 1 && n <= item.choices.length)) return false;
      pick(n - 1);
      return true;
    });
    return {
      // The question is over: the right choice is shown, and each picture is named.
      reveal: function (answer) {
        var key = typeof answer === 'string' ? answer : item.answer;
        lock();
        item.choices.forEach(function (c, i) {
          if (pictured) picks[i].setAttribute('aria-label', ctx.fmt(L[P + 'picture_of'], { n: i + 1, word: c.text }));
          if (key != null && c.text.slice(0, 80) === key) { boxes[i].classList.add('right'); picks[i].style.opacity = '1'; }
        });
        if (shown) shown.setAttribute('alt', item.word);
      },
    };
  },
  score: function (item, answer, response) {
    var chosen = String(response == null ? '' : response);
    return { correct: chosen !== '' && chosen === String(answer).slice(0, 80), digitsCorrect: null, digitsPossible: null };
  },
};
