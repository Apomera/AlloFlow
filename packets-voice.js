// The computer-voice page (packets-voice.html): gives a word a recording made by Kokoro, an AI voice that runs
// in this tab, for words that have none. It is the one Packets page that uses AI, and only after the teacher asks.
//
// It builds nothing of its own:
//   - the voice is started and its sound is taken by packets_voice_engine.js (shared with Make a read-along),
//     which runs the app's own loader the way the app starts it. Only the voice itself (about 88 MB) is
//     downloaded from Hugging Face, by that loader;
//   - a recording is kept by packets_my_words.js as the word's clip, source 'computer-voice': the makers and the
//     presenter already read My words, so nothing else changes.
// Nothing is loaded or downloaded until "Get the voice" is pressed. A teacher's own recording is never replaced.
(function () {
  'use strict';
  var doc = document, win = window;
  var $ = function (id) { return doc.getElementById(id); };
  var MAX_WORDS = 60, CLIP_LIMIT = 409600;
  var engine = win.AlloPacketVoiceEngine || null;
  var myWords = win.AlloPacketMyWords || null;
  // The word list the makers use: which words already have a recording made ahead of time, and which the makers do not use.
  var wordlist = (win.AlloModules && win.AlloModules.WordSoundsWordlist) || null;
  function rowOf(word) { try { return wordlist ? wordlist.get(word) : null; } catch (_) { return null; } }
  function builtIn(word) { var row = rowOf(word); return !!(row && (row.kokoro || row.shards)); }
  function notUsed(word) { var row = rowOf(word); return !!(row && row.blocked); }
  var state = { words: [], entries: Object.create(null), ready: false, getting: false, making: false, sampling: false, stop: null, makeRun: 0, refreshRun: 0, storage: true, playing: null };
  function makeController() {
    if (typeof win.AbortController === 'function') return new win.AbortController();
    var ctrl = { signal: { aborted: false }, abort: function () { ctrl.signal.aborted = true; } };
    return ctrl;
  }
  function abortError() {
    var err = new Error('Stopped');
    err.name = 'AbortError';
    return err;
  }
  function cancelMake() {
    state.makeRun += 1;
    if (state.stop) { try { state.stop.abort(); } catch (_) {} state.stop = null; }
    state.making = false;
  }

  function el(tag, cls, text) { var node = doc.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; }
  function setText(id, text) { var node = $(id); if (node && node.textContent !== text) node.textContent = text; }
  function show(id, on) { var node = $(id); if (node) node.hidden = !on; }
  function count(n, one, many) { return n + ' ' + (n === 1 ? one : many || one + 's'); }

  // The words in the box: letters only, 2 to 24 of them, each once, at most MAX_WORDS.
  // Tolerates pasted lists: UTF-8 BOM, leading numbering/bullets per line, and outer quotes or punctuation.
  function readWords() {
    var seen = Object.create(null), words = [], refused = [];
    String($('f-words').value || '').replace(/^\uFEFF/, '').split(/\r?\n/).forEach(function (line) {
      var cleanedLine = line.replace(/^\s*(?:\(\d{1,3}\)|\d{1,3}[.)]|[\u2022\u25CF\u25CB\u25AA\u2023\u2043*\u2013\u2014-])\s+/, '');
      cleanedLine.split(/[\s,;]+/).forEach(function (raw) {
        var trimmed = raw.trim();
        if (!trimmed) return;
        var word = trimmed.replace(/^["'\u201c\u201d\u2018\u2019(\[{]+|["'\u201c\u201d\u2018\u2019)\]}.,!?:;]+$/g, '').toLowerCase();
        if (!/^[a-z]{2,24}$/.test(word)) { if (refused.indexOf(trimmed) < 0) refused.push(trimmed); return; }
        if (seen[word]) return;
        seen[word] = true;
        words.push(word);
      });
    });
    var over = Math.max(0, words.length - MAX_WORDS);
    state.words = words.slice(0, MAX_WORDS);
    var said = [];
    if (refused.length) said.push('Left out (a word here is 2 to 24 letters, and letters only): ' + refused.slice(0, 6).join(', ') + (refused.length > 6 ? ' and ' + (refused.length - 6) + ' more' : '') + '.');
    if (over) said.push('Only the first ' + MAX_WORDS + ' words are used.');
    setText('words-said', said.join(' '));
  }

  function refreshEntries() {
    var run = ++state.refreshRun;
    if (!myWords || !state.storage || !state.words.length) { state.entries = Object.create(null); return Promise.resolve(); }
    return myWords.getMany(state.words).then(function (found) {
      if (run !== state.refreshRun) return;
      state.entries = Object.assign(Object.create(null), found || {});
    }, function () {
      if (run !== state.refreshRun) return;
      state.entries = Object.create(null);
    });
  }
  function clipOf(word) { var entry = state.entries[word]; return entry && entry.clip ? entry.clip : null; }
  // The words "Make recordings for the words that have none" makes: none in My words, none made ahead of time, and a word the makers use.
  function needing() { return state.words.filter(function (word) { return !clipOf(word) && !builtIn(word) && !notUsed(word); }); }

  function stateLine(word) {
    var clip = clipOf(word);
    if (!clip && notUsed(word)) return 'The makers do not use this word, so it needs no recording.';
    if (!clip && builtIn(word)) return 'Packets already has a recording of this word. It needs nothing here.';
    if (!clip) return 'No recording yet.';
    if (clip.source === 'computer-voice') return 'Has a computer-voice recording' + (clip.ms ? ', ' + (clip.ms / 1000).toFixed(1) + ' seconds.' : '.');
    return 'Has your own recording. It is kept as it is.';
  }

  function draw() {
    var list = $('word-rows');
    list.textContent = '';
    state.words.forEach(function (word) {
      var clip = clipOf(word), row = el('li', 'voice-row' + (clip ? ' is-made' : ''));
      row.setAttribute('data-word', word);
      row.appendChild(el('span', 'voice-word', word));
      var line = el('span', 'voice-state', stateLine(word));
      line.id = 'voice-state-' + word;
      row.appendChild(line);
      if (clip) {
        var play = el('button', 'btn btn-small', 'Play');
        play.type = 'button';
        play.setAttribute('aria-label', 'Play the recording of ' + word);
        play.setAttribute('data-play', word);
        play.addEventListener('click', function () { playClip(word); });
        row.appendChild(play);
      }
      if ((!clip && !builtIn(word) && !notUsed(word)) || (clip && clip.source === 'computer-voice')) {
        var make = el('button', 'btn btn-small', clip ? 'Make again' : 'Make recording');
        make.type = 'button';
        make.setAttribute('aria-label', (clip ? 'Make the recording of ' + word + ' again' : 'Make a recording of ' + word));
        make.setAttribute('data-make', word);
        make.disabled = !state.ready || state.making || !state.storage;
        make.addEventListener('click', function () { makeSome([word], true); });
        row.appendChild(make);
      }
      if (clip && clip.source === 'computer-voice') {
        var remove = el('button', 'btn btn-text btn-small', 'Remove');
        remove.type = 'button';
        remove.setAttribute('aria-label', 'Remove the computer-voice recording of ' + word);
        remove.setAttribute('data-remove', word);
        remove.disabled = state.making;
        remove.addEventListener('click', function () { removeClip(word); });
        row.appendChild(remove);
      }
      list.appendChild(row);
    });
    var need = needing().length;
    var makeAllBtn = $('make-all');
    makeAllBtn.disabled = !state.ready || state.making || !state.storage || !need;
    makeAllBtn.setAttribute('aria-busy', state.making ? 'true' : 'false');
    makeAllBtn.textContent = need ? 'Make recordings for the ' + count(need, 'word') + ' that ' + (need === 1 ? 'has' : 'have') + ' none' : 'Make recordings for the words that have none';
    show('stop', state.making);
    var getVoiceBtn = $('get-voice');
    getVoiceBtn.disabled = state.getting || state.ready;
    getVoiceBtn.setAttribute('aria-busy', state.getting ? 'true' : 'false');
    if (state.ready) getVoiceBtn.textContent = 'The voice is ready';
    var sampleBtn = $('hear-sample');
    if (sampleBtn) sampleBtn.disabled = !state.ready || state.making || state.sampling;
  }

  function redraw() { return refreshEntries().then(draw); }

  function playClip(word) {
    var clip = clipOf(word);
    if (!clip || typeof clip.dataUri !== 'string' || !/^data:audio\//i.test(clip.dataUri)) return;
    try { if (state.playing) state.playing.pause(); } catch (_) {}
    var audio = new win.Audio(clip.dataUri);
    state.playing = audio;
    audio.play().catch(function () { setText('rows-said', 'This browser could not play the recording of ' + word + '.'); });
  }

  function removeClip(word) {
    if (!myWords) return;
    myWords.put(word, { clip: null }).then(function () {
      setText('rows-said', 'The computer-voice recording of ' + word + ' is removed.');
      return redraw();
    }, function (error) { setText('rows-said', (error && error.message) || 'The recording could not be removed.'); })
      .then(function () { var again = doc.querySelector('[data-make="' + word + '"]'); if (again) again.focus(); });
  }

  function hearSample() {
    if (!state.ready || state.making || state.sampling || !engine) return;
    var voice = ($('f-voice') && $('f-voice').value) || 'af_heart';
    state.sampling = true;
    setText('sample-said', 'Making a short sample...');
    draw();
    engine.speak('The quick fox jumped over the brown log.', voice, {}).then(function (wav) {
      state.sampling = false;
      draw();
      var uri = engine.toDataUri(wav, 'audio/wav');
      try { if (state.playing) state.playing.pause(); } catch (_) {}
      var audio = new win.Audio(uri);
      state.playing = audio;
      setText('sample-said', 'Playing sample.');
      audio.play().catch(function () { setText('sample-said', 'This browser could not play the sample.'); });
    }, function () {
      state.sampling = false;
      draw();
      setText('sample-said', 'The voice could not make a sample just now.');
    });
  }

  // ---------------------------------------------------------------------------
  // Getting the voice (packets_voice_engine.js starts the app's loader)
  // ---------------------------------------------------------------------------
  function progress(info) {
    var pct = info && typeof info.pct === 'number' ? Math.max(0, Math.min(1, info.pct)) : 0;
    var pctWhole = Math.round(pct * 100);
    var label = (info && info.stage ? String(info.stage).slice(0, 120) : 'Getting the voice') + (pct ? ': ' + pctWhole + ' percent' : '');
    show('voice-making', true);
    var bar = $('voice-bar');
    if (bar) {
      bar.value = pctWhole;
      bar.setAttribute('aria-valuetext', label);
    }
    setText('voice-line', label);
  }
  function getVoice() {
    if (state.getting || state.ready) return;
    state.getting = true;
    setText('voice-problem', '');
    setText('voice-said', 'Getting the voice. Keep this tab open.');
    progress({ stage: 'Starting', pct: 0 });
    draw();
    (engine ? engine.get(progress) : Promise.reject(new Error('The voice could not be started in this browser.')))
      .then(function () {
        state.ready = true;
        state.getting = false;
        show('voice-making', false);
        setText('voice-said', 'The voice is ready. It stays in this browser, so next time it starts faster.');
        setText('make-said', '');
        draw();
        var next = $('make-all');
        if (next && !next.disabled) next.focus();
      })
      .catch(function (error) {
        state.getting = false;
        show('voice-making', false);
        setText('voice-said', '');
        setText('voice-problem', ((error && error.message) || 'The voice could not be downloaded.') + ' Nothing was changed. You can try again.');
        draw();
      });
  }

  // ---------------------------------------------------------------------------
  // Making a recording: the loader's WAV for one word, compressed to MP3 when available, kept in My words
  // ---------------------------------------------------------------------------
  function makeOne(word, signal) {
    var voice = $('f-voice').value || 'af_heart';
    if (signal && signal.aborted) return Promise.reject(abortError());
    // A new recording every time: a second press of "Make again" gives a new one, not the loader's remembered one.
    return engine.speak(word, voice, { word: true, signal: signal }).then(function (bytes) {
      if (signal && signal.aborted) throw abortError();
      var ms = engine.wavMs(bytes);
      var readyMp3 = typeof engine.getMp3 === 'function' ? engine.getMp3().catch(function () { return false; }) : Promise.resolve(false);
      return readyMp3.then(function (hasMp3) {
        if (signal && signal.aborted) throw abortError();
        var mp3 = hasMp3 && typeof engine.wavToMp3 === 'function' ? engine.wavToMp3(bytes, 64) : null;
        if (signal && signal.aborted) throw abortError();
        var out = mp3 || bytes;
        var mime = mp3 ? 'audio/mpeg' : 'audio/wav';
        if (out.length > CLIP_LIMIT) throw new Error('The recording of ' + word + ' is too long to keep.');
        return myWords.put(word, { clip: { dataUri: engine.toDataUri(out, mime), source: 'computer-voice', made: new Date().toISOString(), ms: ms } });
      });
    }, function (error) {
      if (error && error.code === 'no_sound') throw new Error('The voice gave no sound for ' + word + '.');
      if (error && error.code === 'bad_sound') throw new Error('The voice gave a sound this page cannot keep for ' + word + '.');
      throw error;
    });
  }
  // again: the teacher pressed one word's own button, so a computer-voice recording may be made again.
  // A teacher's own recording is never replaced, whatever was pressed.
  function makeSome(words, again) {
    if (state.making || !state.ready || !myWords) return;
    var list = words.filter(function (word) { var clip = clipOf(word); return !clip || (again && clip.source === 'computer-voice'); });
    if (!list.length) return;
    var run = ++state.makeRun;
    var stop = makeController();
    state.making = true;
    state.stop = stop;
    setText('make-problem', '');
    setText('rows-said', '');
    draw();
    var done = 0, failed = [], stopped = false;
    var step = function (index) {
      if (run !== state.makeRun || stop.signal.aborted) { stopped = true; return Promise.resolve(); }
      if (index >= list.length) return Promise.resolve();
      var word = list[index];
      setText('make-said', 'Making ' + (index + 1) + ' of ' + list.length + ': ' + word + '.');
      return makeOne(word, stop.signal).then(function () {
        done += 1;
        return run === state.makeRun ? redraw() : null;
      }, function (error) {
        if (run !== state.makeRun || stop.signal.aborted || (error && error.name === 'AbortError')) { stopped = true; return; }
        failed.push(word + ((error && error.code === 'storage_full') ? ' (this browser is out of room)' : ''));
      }).then(function () { return (stopped || run !== state.makeRun) ? null : step(index + 1); });
    };
    step(0).then(function () {
      if (run !== state.makeRun) return;
      state.making = false;
      if (state.stop === stop) state.stop = null;
      return redraw().then(function () {
        if (run !== state.makeRun) return;
        setText('make-said', (stopped ? 'Stopped. ' : '') + count(done, 'recording') + ' made and kept in My words on this device.' + (done ? ' Press Play to hear each one.' : ''));
        if (failed.length) setText('make-problem', 'Not made: ' + failed.join(', ') + '. You can press Make recording on a word to try it again.');
        var focus = list.length === 1 ? doc.querySelector('[data-play="' + list[0] + '"]') : $('make-all');
        if (focus && !focus.disabled) focus.focus();
      });
    });
  }

  function start() {
    // Words handed over in the address after the #, which browsers do not send to any server: #words=cat,dog
    var handed = /[#&]words=([^&]*)/.exec(win.location.hash || '');
    if (handed) { try { $('f-words').value = decodeURIComponent(handed[1]).split(',').join('\n').slice(0, 2000); } catch (_) {} }
    var timer = 0;
    $('f-words').addEventListener('input', function () {
      if (state.making) { cancelMake(); setText('make-said', 'Stopped because the word list changed.'); }
      setText('rows-said', '');
      win.clearTimeout(timer);
      timer = win.setTimeout(function () { readWords(); redraw(); }, 250);
    });
    $('get-voice').addEventListener('click', getVoice);
    if ($('hear-sample')) $('hear-sample').addEventListener('click', hearSample);
    $('make-all').addEventListener('click', function () { makeSome(needing(), false); });
    $('stop').addEventListener('click', function () { if (state.stop) state.stop.abort(); });
    doc.addEventListener('keydown', function (ev) {
      if (ev.isComposing || ev.keyCode === 229) return;
      if (ev.key === 'Escape' && state.making && state.stop) {
        ev.preventDefault();
        state.stop.abort();
      }
    });
    var ready = myWords && typeof myWords.available === 'function' ? myWords.available() : Promise.resolve(false);
    ready.then(function (ok) { state.storage = !!ok; }, function () { state.storage = false; }).then(function () {
      show('no-storage', !state.storage);
      readWords();
      return redraw();
    });
  }

  win.AlloPacketVoice = { readWords: readWords };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
