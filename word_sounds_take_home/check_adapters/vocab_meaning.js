// Practice and check adapter: Word to meaning (vocab_meaning). Vocabulary multiple choice, made by
// packet_vocab_builder.js from the teacher's checked list (packets-vocab.html). Its two siblings,
// vocab_word.js (Meaning to word) and vocab_blank.js (Fill the blank), are the same code apart from
// the prefix of their labels and their words (tests/packet_vocab_adapter.test.js compares them).
// Item: { word, ask (the text shown: the word, a meaning, or a sentence with ___), choices: [{ text }]
// in the order shown, answer (the first 80 characters of the right choice), read, lang }; a word with its own
// recorded voice also has a clip id (askAudio, or audio on its choice), played in place of the device voice.
// A response is the first 80 characters of the chosen text, because the player keeps 80 of a response.
// Read aloud uses the device's own speech voice, and only a voice the device says runs on the device
// (localService), so nothing is sent; with no such voice, or no speech engine, the buttons are not shown.
// prepare runs when the file is built; render and score are copied into the file with toString and use
// only their arguments (the speech engine is reached through ctx.root).
// 2026-11-13: a blank (___) in the question or a choice is shown as a line, and a screen reader hears the
// word "blank" instead (marked in render; as Word Sounds does, a visually hidden .sr span).
module.exports = {
  id: 'vocab_meaning',
  title: 'Word to meaning',
  labels: {
    vocab_meaning_intro: 'Read each word. Choose what it means.',
    vocab_meaning_directions: 'Read the word. Choose what it means.',
    vocab_meaning_question: 'What does this word mean?',
    vocab_meaning_read: 'Read aloud',
    // 2026-11-13: the name begins with the button's visible words, Hear it (WCAG 2.5.3 Label in Name).
    vocab_meaning_read_choice: 'Hear it: choice {n}',
    vocab_meaning_hear: 'Hear it',
    vocab_meaning_correct: 'Yes. That is what it means.',
    vocab_meaning_retry: 'Not quite. Try once more.',
    vocab_meaning_missed: 'Here is the right answer.',
    vocab_meaning_practice_wrong: 'Not quite. Here is the right answer.',
    vocab_meaning_blank: 'blank',
  },
  // p: { word, ask, choices: [text, ...], answer: the right text, read: true | false, lang,
  //   askAudio: the clip id of the word asked (optional), choiceAudio: [clip id or null, ...] (optional) }
  // A clip id names a recording in lesson.audio: a word's own recorded voice, played in place of the device voice.
  prepare: function (p) {
    p = p || {};
    var line = function (v, max) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''; };
    var clip = function (v) { return typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : ''; };
    var word = line(p.word, 300), ask = line(p.ask, 300);
    if (!word || !ask) return { missing: ['word'] };
    if (!Array.isArray(p.choices) || p.choices.length < 2 || p.choices.length > 6) return { missing: ['choices'] };
    var texts = p.choices.map(function (c) { return line(c, 300); });
    var keys = texts.map(function (t) { return t.slice(0, 80); });
    if (texts.some(function (t) { return !t; }) || keys.some(function (k, i) { return keys.indexOf(k) !== i; })) return { missing: ['different choices'] };
    var answer = line(p.answer, 300).slice(0, 80);
    if (!answer || keys.indexOf(answer) < 0) return { missing: ['an answer that is one of the choices'] };
    var lang = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(String(p.lang || '')) ? String(p.lang) : 'en';
    var heard = Array.isArray(p.choiceAudio) ? p.choiceAudio : [];
    var item = { word: word, ask: ask, choices: texts.map(function (t, i) { var c = { text: t }; if (clip(heard[i])) c.audio = clip(heard[i]); return c; }), answer: answer, read: p.read === true, lang: lang };
    if (clip(p.askAudio)) item.askAudio = clip(p.askAudio);
    return { item: item };
  },
  render: function (item, ctx) {
    var P = 'vocab_meaning_';
    var L = ctx.L;
    var doc = ctx.root.ownerDocument;
    var view = doc && doc.defaultView;
    var synth = item.read && view && view.speechSynthesis && typeof view.SpeechSynthesisUtterance === 'function' ? view.speechSynthesis : null;
    var lang = String(item.lang || 'en').toLowerCase();
    var voice = function () {
      var all = [];
      try { all = synth.getVoices() || []; } catch (_) { all = []; }
      var local = all.filter(function (v) { return v && v.localService === true; });
      var match = function (v) { return String(v.lang || '').toLowerCase().replace('_', '-'); };
      return local.filter(function (v) { return match(v) === lang || match(v).indexOf(lang + '-') === 0; })[0] || null;
    };
    if (synth) { try { synth.cancel(); synth.getVoices(); } catch (_) {} }
    var readers = [];
    // Says a text with the device voice; the Promise settles when it is over (or after a while, for a voice that never says so).
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
    // iPad and iPhone speak only after a press has started the voice once: a silent start inside the press.
    var wake = function () { if (!synth || !voice()) return; try { var u = new view.SpeechSynthesisUtterance(''); u.volume = 0; synth.speak(u); } catch (_) {} };
    var hush = function () { if (synth) { try { synth.cancel(); } catch (_) {} } };
    // A word with its own recorded voice plays that clip; any other text is read by the device voice.
    // A meaning written with a blank ("If something ___ it rots") is read with the word "blank", as the question is.
    var sayChoice = function (c) { return c.audio ? ctx.play(c.audio) : say(c.text.replace(/_{2,}/g, ', blank, ')); };
    var sayAsk = function () {
      var question = L[P + 'question'];
      if (item.askAudio) { wake(); return ctx.play(item.askAudio).then(function () { return say(question); }); }
      return say(item.ask.replace(/_{2,}/g, ', blank, ') + '. ' + question);
    };
    // A read button shows once it can be heard: a recorded clip, or a voice that runs on the device (voices can arrive a moment later).
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
    var marked = function (text) {
      return String(text).split(/(_{2,})/).filter(Boolean).map(function (part) { return /^_{2,}$/.test(part) ? ctx.el('span', {}, [ctx.el('span', { 'aria-hidden': 'true', text: part }), ctx.el('span', { class: 'sr', text: L[P + 'blank'] })]) : part; });
    };
    var ask = ctx.el('p', { class: 'letters', lang: item.lang || 'en', 'data-read': '', style: item.ask.length <= 30 ? 'font-size:2rem;margin:8px 0' : 'font-size:1.35rem;line-height:1.5;margin:8px 0' }, marked(item.ask));
    ctx.root.appendChild(ctx.el('p', { class: 'muted', style: 'margin:0', text: L[P + 'question'] }));
    ctx.root.appendChild(ask);
    var readRow = ctx.el('div', { class: 'row' }, [reader(sayAsk, { 'data-read-aloud': 'question' }, L[P + 'read'], !!item.askAudio)]);
    ctx.root.appendChild(readRow);
    var list = ctx.el('ul', { class: 'choices', style: 'grid-template-columns:1fr' });
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
      var b = ctx.el('button', { type: 'button', lang: item.lang || 'en', 'data-choice': String(i + 1), style: 'flex:1 1 auto;text-align:start;font-size:1.2rem;line-height:1.4;min-height:56px',
        on: { click: function () { pick(i); } } }, [ctx.el('span', { 'aria-hidden': 'true', style: 'font-weight:700;margin-inline-end:10px', text: String(i + 1) })].concat(marked(c.text)));
      var box = ctx.el('li', { class: 'choice', style: 'flex-direction:row;align-items:center;flex-wrap:wrap' }, [b,
        reader(function () { sayChoice(c); }, { 'data-read-aloud': 'choice-' + (i + 1), 'aria-label': ctx.fmt(L[P + 'read_choice'], { n: i + 1 }), style: 'min-height:48px;padding:6px 12px' }, L[P + 'hear'], !!c.audio)]);
      boxes.push(box); picks.push(b); tried.push(false);
      list.appendChild(box);
    });
    // Hear all (the player's ctx.hearAll): each choice in turn, marked with its number. With the reading tool
    // "Read the choices when a question opens" it starts by itself, once the student has pressed something.
    hear = typeof ctx.hearAll === 'function' ? ctx.hearAll({ stop: hush, before: wake, ready: function () { return !hear.button.hidden && !ctx.isDone(); },
      list: function () { return item.choices.map(function (c, i) { return { box: boxes[i], say: function () { return sayChoice(c); } }; }); } }) : null;
    // In the row of Read aloud, so the buttons stay together.
    if (hear) { readRow.appendChild(hear.button); readRow.appendChild(hear.note); }
    ctx.root.appendChild(list);
    showReaders();
    // Voices that arrive later: one handler, the item on view's (a listener for each item kept every item alive).
    if (synth) { try { synth.onvoiceschanged = showReaders; } catch (_) {} }
    // In a check the keys 1 to 9 pick a choice (in practice the player does this itself).
    if (typeof ctx.keys === 'function') ctx.keys(function (key) {
      var n = Number(key);
      if (!(n >= 1 && n <= item.choices.length)) return false;
      pick(n - 1);
      return true;
    });
    return {
      // Practice: the right choice is shown (a check's practice item passes the right answer).
      reveal: function (answer) {
        var key = typeof answer === 'string' ? answer : item.answer;
        lock();
        item.choices.forEach(function (c, i) { if (key != null && c.text.slice(0, 80) === key) { boxes[i].classList.add('right'); picks[i].style.opacity = '1'; } });
      },
    };
  },
  score: function (item, answer, response) {
    var chosen = String(response == null ? '' : response);
    return { correct: chosen !== '' && chosen === String(answer).slice(0, 80), digitsCorrect: null, digitsPossible: null };
  },
};
