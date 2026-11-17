// "Make a read-along" (packets-read-along.html): a passage becomes one file that reads it aloud, one sentence at
// a time, with the sentence marked. One of the two Packets pages that use the AI voice, and only after the
// teacher asks.
//
// It builds nothing of its own:
//   - the voice is started and its sound is taken by packets_voice_engine.js, which runs the app's own loader
//     and the app's own MP3 encoder (shared with Make recordings with a computer voice);
//   - the passage is split and the file is made by packet_read_along_builder.js, through the engine every other
//     student file uses (word_sounds_take_home_loader.js, its read_along activity);
//   - the syllable breaks for the file's Syllables button are looked up in the app's own English syllable table
//     (syllable_table_en.js), and only the breaks it is sure of are used.
// The passage and the recordings live in this tab's memory only. The saved file plays recordings; it has no AI.
(function () {
  'use strict';
  var doc = document, win = window;
  var $ = function (id) { return doc.getElementById(id); };
  var engine = win.AlloPacketVoiceEngine || null, builder = win.AlloPacketReadAlong || null, loader = win.AlloWordSoundsTakeHome || null;
  var TRY_PAGE = 'packets-try.html', MP3_KBPS = 64;
  // The app's English syllable table. A word it marks "check" (it is not sure of the break) is left whole.
  var table = (win.AlloModules && win.AlloModules.SyllableTableEn) || null;
  function syllablesOf(word) { var found = table ? table.lookup(word) : null; return found && !found.check ? found.parts : null; }
  function tableSource() { var src = table && table.source ? table.source : null; return src ? [src.moby, src.cmudict].filter(function (v) { return typeof v === 'string' && v; }).join('; checked against ') : ''; }
  // clips: { "the sentence": { uri, ms, voice } }, by the builder's key for a sentence.
  var state = { sentences: [], total: 0, clips: {}, ready: false, getting: false, making: false, stop: null, mp3: false, playing: null, built: null, fileUrl: '', unsaved: false };
  var buildTimer = 0;

  function el(tag, cls, text) { var node = doc.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; }
  function setText(id, text) { var node = $(id); if (node && node.textContent !== text) node.textContent = text; }
  function show(id, on) { var node = $(id); if (node) node.hidden = !on; }
  function count(n, one, many) { return n + ' ' + (n === 1 ? one : many || one + 's'); }
  function fileSize(bytes) { return bytes >= 1e6 ? (bytes / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1000)) + ' KB'; }
  function said(error) { return String((error && error.message) || error || ''); }

  function keyOf(row) { return builder.clipKey(row.text); }
  function clipOf(row) { var key = keyOf(row); return Object.prototype.hasOwnProperty.call(state.clips, key) ? state.clips[key] : null; }
  function needing() { return state.sentences.filter(function (row) { return !clipOf(row); }); }
  function pages() { return builder.pagesOf(state.sentences).length; }

  // ---------------------------------------------------------------------------
  // Step 1: the passage, as the sentences the file will read
  // ---------------------------------------------------------------------------
  function readPassage() {
    var text = String($('f-text').value || '');
    state.sentences = builder.splitPassage(text);
    state.total = builder.sentenceCount(text);
    var n = state.sentences.length, line = '';
    if (n) line = count(n, 'sentence') + ', on ' + count(pages(), 'page') + ' of the file.';
    if (state.total > n) line += ' A read-along has at most ' + builder.MAX_SENTENCES + ' sentences, so the last ' + count(state.total - n, 'sentence') + ' of this passage ' + (state.total - n === 1 ? 'is' : 'are') + ' left out.';
    setText('text-said', line);
  }

  function stateLine(row) {
    var clip = clipOf(row);
    if (!clip) return 'No recording yet.';
    return 'Recorded' + (clip.ms ? ', ' + (clip.ms / 1000).toFixed(1) + ' seconds.' : '.');
  }

  function draw() {
    var list = $('line-rows');
    list.textContent = '';
    state.sentences.forEach(function (row, index) {
      var clip = clipOf(row), n = index + 1;
      var item = el('li', 'voice-row' + (clip ? ' is-made' : '') + (row.para ? ' ra-para' : ''));
      item.setAttribute('data-line', String(n));
      item.appendChild(el('span', 'ra-text', row.text));
      item.appendChild(el('span', 'voice-state', stateLine(row)));
      if (clip) {
        var play = el('button', 'btn btn-small', 'Play');
        play.type = 'button';
        play.setAttribute('aria-label', 'Play sentence ' + n);
        play.setAttribute('data-play', String(n));
        play.addEventListener('click', function () { playClip(row); });
        item.appendChild(play);
      }
      var make = el('button', 'btn btn-small', clip ? 'Make again' : 'Make recording');
      make.type = 'button';
      make.setAttribute('aria-label', (clip ? 'Make the recording of sentence ' + n + ' again' : 'Make a recording of sentence ' + n));
      make.setAttribute('data-make', String(n));
      make.disabled = !state.ready || state.making;
      make.addEventListener('click', function () { makeSome([row], n); });
      item.appendChild(make);
      list.appendChild(item);
    });
    var need = needing().length;
    $('make-all').disabled = !state.ready || state.making || !need;
    $('make-all').textContent = need && need < state.sentences.length ? 'Make the recordings for the ' + count(need, 'sentence') + ' that ' + (need === 1 ? 'has' : 'have') + ' none'
      : need ? 'Make the recordings for ' + (need === 1 ? 'the sentence' : 'all ' + need + ' sentences') : 'Make the recordings';
    show('stop', state.making);
    $('get-voice').disabled = state.getting || state.ready;
    if (state.ready) $('get-voice').textContent = 'The voice is ready';
    if (!state.making) {
      if (!state.sentences.length) setText('make-said', state.ready ? 'Type a passage in step 1.' : 'Type a passage in step 1 and get the voice in step 2 first.');
      else if (!state.ready) setText('make-said', 'Get the voice in step 2 first.');
      else if (need === state.sentences.length) setText('make-said', 'The voice is ready. Press the button to make ' + (need === 1 ? 'the recording' : 'the ' + need + ' recordings') + '.');
    }
  }

  function playClip(row) {
    var clip = clipOf(row);
    if (!clip) return;
    try { if (state.playing) state.playing.pause(); } catch (_) {}
    var audio = new win.Audio(clip.uri);
    state.playing = audio;
    audio.play().catch(function () { setText('make-problem', 'This browser could not play that recording.'); });
  }

  // ---------------------------------------------------------------------------
  // Step 2: the voice (packets_voice_engine.js), and the encoder that makes a recording smaller
  // ---------------------------------------------------------------------------
  function progress(info) {
    var pct = info && typeof info.pct === 'number' ? Math.max(0, Math.min(1, info.pct)) : 0;
    show('voice-making', true);
    $('voice-bar').value = Math.round(pct * 100);
    setText('voice-line', (info && info.stage ? String(info.stage).slice(0, 120) : 'Getting the voice') + (pct ? ': ' + Math.round(pct * 100) + ' percent' : ''));
  }
  function getVoice() {
    if (state.getting || state.ready) return;
    state.getting = true;
    setText('voice-problem', '');
    setText('voice-said', 'Getting the voice. Keep this tab open.');
    progress({ stage: 'Starting', pct: 0 });
    draw();
    engine.get(progress)
      .then(function () { return engine.getMp3(); })
      .then(function (mp3) {
        state.mp3 = !!mp3;
        state.ready = true;
        state.getting = false;
        show('voice-making', false);
        setText('voice-said', 'The voice is ready. It stays in this browser, so next time it starts faster.' + (state.mp3 ? '' : ' The part that makes recordings smaller did not arrive, so the file will be larger than usual.'));
        draw();
        var next = $('make-all');
        if (next && !next.disabled) next.focus();
      })
      .catch(function (error) {
        state.getting = false;
        show('voice-making', false);
        setText('voice-said', '');
        setText('voice-problem', (said(error) || 'The voice could not be downloaded.') + ' Nothing was changed. You can try again.');
        draw();
      });
  }

  // ---------------------------------------------------------------------------
  // Step 3: one recording for each sentence
  // ---------------------------------------------------------------------------
  function makeOne(row, signal) {
    var voice = $('f-voice').value || 'af_heart';
    return engine.speak(row.text, voice, { signal: signal }).then(function (wav) {
      var mp3 = state.mp3 ? engine.wavToMp3(wav, MP3_KBPS) : null;
      var uri = mp3 ? engine.toDataUri(mp3, 'audio/mpeg') : engine.toDataUri(wav, 'audio/wav');
      if (uri.length > builder.MAX_CLIP_CHARS) throw new Error('too long');
      state.clips[keyOf(row)] = { uri: uri, ms: engine.wavMs(wav), voice: voice };
      state.unsaved = true;
    });
  }
  // rows: the sentences to record. one: the number of the sentence whose own button was pressed, when it was one.
  function makeSome(rows, one) {
    if (state.making || !state.ready || !rows.length) return;
    state.making = true;
    state.stop = new win.AbortController();
    clearBuilt();
    setText('make-problem', '');
    setText('file-said', 'Making the recordings.');
    draw();
    var done = 0, failed = [], stopped = false, numbers = rows.map(function (row) { return state.sentences.indexOf(row) + 1; });
    var step = function (index) {
      if (index >= rows.length || state.stop.signal.aborted) { stopped = state.stop.signal.aborted && index < rows.length; return Promise.resolve(); }
      setText('make-said', 'Making ' + (index + 1) + ' of ' + rows.length + '.');
      return makeOne(rows[index], state.stop.signal).then(function () { done += 1; }, function (error) {
        if (error && error.name === 'AbortError') { stopped = true; return; }
        failed.push(numbers[index]);
      }).then(function () { return stopped ? null : step(index + 1); });
    };
    step(0).then(function () {
      state.making = false;
      state.stop = null;
      draw();
      setText('make-said', (stopped ? 'Stopped. ' : '') + count(done, 'recording') + ' made.' + (done ? ' Press Play to hear ' + (done === 1 ? 'it' : 'each one') + '.' : ''));
      if (failed.length) setText('make-problem', 'Not made: ' + (failed.length === 1 ? 'sentence ' : 'sentences ') + failed.join(', ') + '. The voice gave no sound it could keep. Press Make recording on a sentence to try again, or change the sentence.');
      refreshFile();
      var focus = one ? doc.querySelector('[data-play="' + one + '"]') || doc.querySelector('[data-make="' + one + '"]') : $('save');
      if (!focus || focus.hidden || focus.disabled) focus = $('make-all');
      if (focus && !focus.disabled && !focus.hidden) focus.focus();
    });
  }

  // ---------------------------------------------------------------------------
  // Step 4: the file
  // ---------------------------------------------------------------------------
  function fileName() {
    var stem = String($('f-title').value || '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return (stem || 'read-along') + '.html';
  }
  function clearBuilt() {
    win.clearTimeout(buildTimer);
    state.built = null;
    if (state.fileUrl) { try { URL.revokeObjectURL(state.fileUrl); } catch (_) {} state.fileUrl = ''; }
    show('try', false);
    show('save', false);
    show('after-save', false);
    setText('file-sub', '');
    setText('file-problem', '');
  }
  function refreshFile() {
    clearBuilt();
    if (state.making) return;
    var recorded = state.sentences.length - needing().length;
    if (!state.sentences.length || !recorded) { setText('file-said', 'The file is ready when the sentences have recordings.'); return; }
    var clips = {}, voices = [];
    state.sentences.forEach(function (row) {
      var clip = clipOf(row);
      if (!clip) return;
      clips[keyOf(row)] = clip.uri;
      if (voices.indexOf(clip.voice) < 0) voices.push(clip.voice);
    });
    var made, result;
    try {
      made = builder.lessonFromReadAlong({ loader: loader, title: $('f-title').value, sentences: state.sentences, clips: clips, voice: voices.join(', '), syllables: table ? syllablesOf : null, syllableSource: tableSource() });
      result = builder.buildReadAlongPacket({ made: made, loader: loader });
    } catch (error) {
      setText('file-said', 'The file is not ready yet.');
      setText('file-problem', said(error) || 'The file could not be put together.');
      return;
    }
    var blob = new Blob([result.html], { type: 'text/html' });
    state.built = { html: result.html, name: fileName(), bytes: blob.size };
    try { state.fileUrl = URL.createObjectURL(blob); } catch (_) { state.fileUrl = ''; }
    setText('file-said', 'The file is ready: ' + count(made.sentences, 'sentence') + ' on ' + count(made.pages, 'page') + ', ' + fileSize(blob.size) + '.');
    setText('file-sub', (made.missing ? count(made.missing, 'sentence') + ' ' + (made.missing === 1 ? 'has' : 'have') + ' no recording. The student sees ' + (made.missing === 1 ? 'it' : 'them') + ', and the file does not read ' + (made.missing === 1 ? 'it' : 'them') + ' aloud. ' : '')
      + (made.syllables ? 'It has a Syllables button, which shows longer words in parts (' + made.syllables.example + '). ' : '')
      + 'It will be saved as ' + state.built.name + '.');
    if (state.fileUrl) { $('try').setAttribute('href', TRY_PAGE + '#' + state.fileUrl); show('try', true); }
    show('save', true);
  }
  function refreshSoon() { clearBuilt(); buildTimer = win.setTimeout(refreshFile, 300); }
  function saveFile() {
    if (!state.built) return;
    var url = state.fileUrl;
    if (!url) { try { url = URL.createObjectURL(new Blob([state.built.html], { type: 'text/html' })); } catch (_) { url = ''; } }
    if (!url) { setText('file-problem', 'This browser cannot save files from a page. Open this page in Chrome, Edge, Firefox or Safari.'); return; }
    var link = doc.createElement('a');
    link.href = url;
    link.download = state.built.name;
    link.hidden = true;
    doc.body.appendChild(link);
    link.click();
    doc.body.removeChild(link);
    state.unsaved = false;
    show('after-save', true);
    $('after-save').focus();
  }

  function start() {
    if (!engine || !builder || !loader || !loader.CHECK_ADAPTERS || !loader.CHECK_ADAPTERS[builder.ACTIVITY]) { show('no-parts', true); return; }
    var timer = 0;
    $('f-text').addEventListener('input', function () { win.clearTimeout(timer); timer = win.setTimeout(function () { readPassage(); draw(); refreshSoon(); }, 250); });
    $('f-title').addEventListener('input', refreshSoon);
    $('get-voice').addEventListener('click', getVoice);
    $('make-all').addEventListener('click', function () { makeSome(needing(), 0); });
    $('stop').addEventListener('click', function () { if (state.stop) state.stop.abort(); });
    $('save').addEventListener('click', saveFile);
    // The recordings exist only on this page: ask before they are lost.
    win.addEventListener('beforeunload', function (event) { if (state.unsaved) { event.preventDefault(); event.returnValue = ''; } });
    readPassage();
    draw();
  }

  win.AlloPacketReadAlongPage = { state: state };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
