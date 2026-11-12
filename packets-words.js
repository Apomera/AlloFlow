// "Edit this word" on the maker page (packets-make.html): the panel under a word of the word list.
// Three parts, each optional: the word's sounds (how its letters split into sounds), a recording the
// teacher makes, and a picture. What the teacher keeps is written to packets_my_words.js, the store in
// this browser for this site; packets-make.js reads it back when it makes a file. Nothing here sends
// anything or loads anything: no request, no other site.
//
// The microphone: asked for only when the teacher presses "Record it yourself", and let go when the
// recording stops (Stop, or RECORD_MS). The sound is decoded in the page, made one channel at RATE,
// trimmed of the quiet before and after the word, and written as a WAV file (16-bit), which every
// browser plays and the builder puts into a file as it is. A word of about a second is about 50 KB.
//
// window.AlloPacketWordPanel = { create(env), trimSilence, encodeWav, resample, guessSounds, ... }
//   env: { store, core, wordlist, symbols, soundGroups, soundName, bankClip(word) -> Promise<data: or null>,
//          bankNote(word) -> '' or a line, playable(uri) -> Promise<uri>, picturesPage }
//   create(env).open(host, word, { onClose }) -> { root, word, update(entry), destroy(), focus() }
(function (root) {
  'use strict';

  var RECORD_MS = 4000;      // the longest recording: one word
  var RATE = 22050;          // samples a second in the kept file: enough for s, f and th
  var PAD_MS = 90;           // kept before and after the word when the quiet is trimmed
  var FADE_MS = 8;
  var PICTURES_PAGE = 'packets-pictures.html';
  var TEXT = {
    title: 'Edit this word: {word}',
    close: 'Close',
    notKeeping: 'This browser is not keeping your words, so nothing here can be kept.',
    sounds: 'Sounds',
    fromDictionary: 'From the sound dictionary.',
    yours: 'Your sounds.',
    dictionaryHas: 'The sound dictionary has: {list}.',
    notInDictionary: 'Not in the sound dictionary. Set its sounds to use it.',
    noLetters: 'The letters for each sound are not known, so Sound Mapping leaves this word out.',
    change: 'Change the sounds',
    set: 'Set the sounds',
    backToDictionary: "Use the dictionary's sounds",
    removeSounds: 'Remove my sounds',
    editorHint: 'Choose each sound in order, then check the letters for each sound.',
    firstGuess: 'A first guess from the letters. Check each sound in order, then the letters for each sound.',
    soundN: 'Sound {n}',
    removeSoundN: 'Remove sound {n}',
    addSound: 'Add a sound',
    letters: 'Letters for each sound',
    lettersHint: 'One group of letters for each sound, with a space between: {example}',
    lettersUnknown: 'Type the letters for each sound, with a space between.',
    keepSounds: 'Keep these sounds',
    cancel: 'Cancel',
    needSound: 'Choose at least one sound.',
    tooManySounds: 'A word has at most {n} sounds.',
    mustSpell: 'The letters must spell {word}. These spell {spelled}.',
    lettersOnly: 'Use letters only, with a space between the groups.',
    oneGroupEach: 'Give one group of letters for each sound: {sounds}, {groups}.',
    keptSounds: 'Kept. Files you make with this word use these sounds.',
    removedSounds: 'Removed. The word uses the sound dictionary again.',
    removedSoundsNone: 'Removed.',
    recording: 'Recording',
    yourRecording: 'Your recording, {s} seconds.',
    bankRecording: 'Recording from the word bank.',
    noRecording: 'No recording yet.',
    play: 'Play',
    record: 'Record it yourself',
    recordAgain: 'Record it again',
    removeRecording: 'Remove my recording',
    recordNote: 'The recording stays on this device. The microphone is used only while you record.',
    asking: 'Asking the browser for the microphone.',
    recordingNow: 'Recording. Say the word once, then press Stop.',
    stop: 'Stop',
    working: 'Getting the recording ready.',
    review: 'Listen to it, then keep it or record it again.',
    reviewLength: 'It is {s} seconds long.',
    keep: 'Keep it',
    keptRecording: 'Kept. Files you make with this word use your recording.',
    removedRecording: 'Removed.',
    cannotRecord: 'This browser cannot record on this page. You can choose another word.',
    notAllowed: 'The microphone was not allowed, so nothing was recorded. To record, allow the microphone for this site in the browser, then press Record it yourself again.',
    noMicrophone: 'No microphone was found on this device.',
    micBusy: 'The microphone could not be started. Another program may be using it.',
    nothingHeard: 'Nothing was heard. Check the microphone, then record it again.',
    cannotRead: 'This browser could not read the recording. Try again, or use another browser.',
    cannotPlay: 'This browser could not play the recording.',
    gettingSounds: 'Getting the sounds first, about {mb} MB, one time.',
    picture: 'Picture',
    yourPicture: 'Your own picture.',
    pictureAlt: 'Your picture for {word}',
    symbol: 'A Mulberry symbol is used for this word when pictures are included.',
    noPicture: 'No picture yet.',
    usePicture: 'Use my own picture',
    pictureNote: 'Use only a picture you have the right to share.',
    findPicture: 'Find a picture online',
    newTab: '(opens in a new tab)',
    removePicture: 'Remove the picture',
    readingPicture: 'Making the picture small enough to keep.',
    keptPicture: 'Kept. Files you make with pictures show it for this word.',
    removedPicture: 'Removed.',
  };

  function fmt(template, values) { return String(template).replace(/\{(\w+)\}/g, function (m, key) { return values && values[key] != null ? values[key] : m; }); }
  function count(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function isObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }

  // ---------------------------------------------------------------------------------------------------
  // Sound: one channel, resampled, trimmed, written as WAV
  // ---------------------------------------------------------------------------------------------------
  function mono(buffer) {
    var channels = Math.max(1, Number(buffer.numberOfChannels) || 1), length = buffer.length, out = new Float32Array(length);
    for (var c = 0; c < channels; c++) {
      var data = buffer.getChannelData(c);
      for (var i = 0; i < length; i++) out[i] += data[i] / channels;
    }
    return out;
  }
  // Linear: a spoken word needs nothing finer, and the kept rate is below the recorded one.
  function resample(samples, from, to) {
    if (!(from > 0) || from === to) return samples;
    var length = Math.max(1, Math.round(samples.length * to / from)), out = new Float32Array(length), step = from / to;
    for (var i = 0; i < length; i++) {
      var at = i * step, j = Math.floor(at), frac = at - j;
      var a = samples[Math.min(j, samples.length - 1)], b = samples[Math.min(j + 1, samples.length - 1)];
      out[i] = a + (b - a) * frac;
    }
    return out;
  }
  // The word without the quiet before and after it, softly faded, and brought up when it was faint.
  // Returns null when nothing louder than the room was heard.
  function trimSilence(samples, rate) {
    var peak = 0, i;
    for (i = 0; i < samples.length; i++) { var v = Math.abs(samples[i]); if (v > peak) peak = v; }
    if (peak < 0.02) return null;
    // Loudness in windows of 10 ms: a click is one loud sample, a word is many.
    var win = Math.max(1, Math.round(rate / 100)), levels = [], loudest = 0;
    for (i = 0; i < samples.length; i += win) {
      var sum = 0, end = Math.min(samples.length, i + win);
      for (var k = i; k < end; k++) sum += samples[k] * samples[k];
      var level = Math.sqrt(sum / (end - i));
      levels.push(level);
      if (level > loudest) loudest = level;
    }
    var floor = Math.max(0.008, loudest * 0.1);
    var first = -1, last = -1;
    for (i = 0; i < levels.length; i++) if (levels[i] >= floor) { if (first < 0) first = i; last = i; }
    if (first < 0) return null;
    var pad = Math.round(rate * PAD_MS / 1000);
    var from = Math.max(0, first * win - pad), to = Math.min(samples.length, (last + 1) * win + pad);
    var out = samples.slice(from, to);
    var gain = Math.min(4, 0.89 / peak), fade = Math.min(Math.round(rate * FADE_MS / 1000), Math.floor(out.length / 2));
    for (i = 0; i < out.length; i++) {
      var edge = i < fade ? i / fade : i >= out.length - fade ? (out.length - 1 - i) / fade : 1;
      out[i] = Math.max(-1, Math.min(1, out[i] * gain * edge));
    }
    return out;
  }
  function base64(bytes) {
    var text = '', CHUNK = 0x8000;
    for (var i = 0; i < bytes.length; i += CHUNK) text += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    return typeof root.btoa === 'function' ? root.btoa(text) : Buffer.from(text, 'binary').toString('base64');
  }
  // 16-bit PCM, one channel, as a data: address.
  function encodeWav(samples, rate) {
    var n = samples.length, bytes = new Uint8Array(44 + n * 2), view = new DataView(bytes.buffer);
    var put = function (at, text) { for (var i = 0; i < text.length; i++) bytes[at + i] = text.charCodeAt(i); };
    put(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); put(8, 'WAVE'); put(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); put(36, 'data'); view.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) { var s = Math.max(-1, Math.min(1, samples[i])); view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true); }
    return 'data:audio/wav;base64,' + base64(bytes);
  }
  // Decoded by an offline context, so no sound device is opened. The browser resamples to the
  // context's rate; a browser that will not make a context at RATE decodes at its own and the page resamples.
  function decodeRecording(arrayBuffer) {
    var Offline = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    if (typeof Offline !== 'function') return Promise.reject(new Error('no decoder'));
    var attempt = function (rate) {
      return new Promise(function (resolve, reject) {
        var context;
        try { context = new Offline(1, 1, rate); } catch (error) { reject(error); return; }
        var settled = false;
        var ok = function (buffer) { if (!settled) { settled = true; resolve(buffer); } };
        var no = function (error) { if (!settled) { settled = true; reject(error || new Error('decode')); } };
        try {
          var made = context.decodeAudioData(arrayBuffer.slice(0), ok, no);
          if (made && typeof made.then === 'function') made.then(ok, no);
        } catch (error) { no(error); }
      });
    };
    return attempt(RATE).then(null, function () { return attempt(44100); }).then(function (buffer) {
      return resample(mono(buffer), Number(buffer.sampleRate) || RATE, RATE);
    });
  }

  // A first guess at a word's sounds from its letters, for a word the dictionary does not have (a name).
  // The teacher checks each one; nothing is kept until they press Keep.
  var GUESS = [['tch', ['ch']], ['igh', ['ie']], ['dge', ['j']], ['sh', ['sh']], ['ch', ['ch']], ['th', ['th']], ['ph', ['f']], ['wh', ['w']], ['ng', ['ng']], ['ck', ['k']],
    ['qu', ['k', 'w']], ['kn', ['n']], ['wr', ['r']], ['ee', ['ee']], ['ea', ['ee']], ['ai', ['ay']], ['ay', ['ay']], ['ey', ['ay']], ['oa', ['oa']], ['oe', ['oa']], ['oo', ['oo']], ['ue', ['oo']],
    ['ew', ['oo']], ['oi', ['oy']], ['oy', ['oy']], ['ou', ['ow']], ['ow', ['ow']], ['au', ['aw']], ['aw', ['aw']], ['ar', ['ar']], ['or', ['or']], ['er', ['er']], ['ir', ['ir']], ['ur', ['ur']],
    ['x', ['k', 's']], ['c', ['k']], ['q', ['k']]];
  function guessSounds(word, inventory) {
    var w = String(word || '').toLowerCase(), sounds = [], i = 0;
    var known = function (label) { return !inventory || inventory.indexOf(label) >= 0; };
    while (i < w.length) {
      var hit = null;
      for (var g = 0; g < GUESS.length && !hit; g++) if (w.slice(i, i + GUESS[g][0].length) === GUESS[g][0]) hit = GUESS[g];
      // A doubled letter is one sound (ll, ss, tt); y at the end after a consonant is ee; a final e after a consonant is silent.
      if (!hit && i > 0 && w.charAt(i) === w.charAt(i - 1) && !/[aeiou]/.test(w.charAt(i))) { i++; continue; }
      if (!hit && w.charAt(i) === 'y' && i === w.length - 1 && i > 0) hit = ['y', ['ee']];
      if (!hit && w.charAt(i) === 'e' && i === w.length - 1 && i > 1 && !/[aeiou]/.test(w.charAt(i - 1))) { i++; continue; }
      if (!hit) hit = [w.charAt(i), [w.charAt(i)]];
      hit[1].forEach(function (label) { if (known(label)) sounds.push(label); });
      i += hit[0].length;
    }
    return sounds.slice(0, 24);
  }

  // ---------------------------------------------------------------------------------------------------
  // The panel
  // ---------------------------------------------------------------------------------------------------
  function create(env) {
    var doc = root.document;
    var store = env.store && typeof env.store.put === 'function' ? env.store : null;
    var core = env.core, groups = env.soundGroups || [];
    var inventory = [];
    groups.forEach(function (group) { group[1].forEach(function (row) { inventory.push(row[0]); }); });
    var example = {};
    groups.forEach(function (group) { group[1].forEach(function (row) { example[row[0]] = row[1]; }); });
    var soundName = typeof env.soundName === 'function' ? env.soundName : function (label) { return label; };
    var limits = store && store.LIMITS ? store.LIMITS : (root.AlloPacketMyWords && root.AlloPacketMyWords.LIMITS) || { sounds: 24, clipBytes: 409600 };
    var serial = 0;
    var kept = null;
    var keeping = function () {
      if (!store) return Promise.resolve(false);
      if (!kept) kept = store.available().then(function (ok) { return !!ok; }, function () { return false; });
      return kept;
    };

    var el = function (tag, className, text) {
      var node = doc.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    };
    var button = function (text, className, label) {
      var node = el('button', 'btn btn-small' + (className ? ' ' + className : ''), text);
      node.type = 'button';
      if (label) node.setAttribute('aria-label', label);
      return node;
    };
    var describe = function (label) { return soundName(label) + (example[label] ? ', as in ' + example[label] : ''); };
    // The letters for each sound: what was kept, when it still spells the word, else what the aligner finds.
    var spellingFor = function (word, sounds, kept) {
      if (Array.isArray(kept) && kept.length) {
        var spelled = kept.map(function (chunk) { return chunk && chunk.text; }).join(''), covered = kept.reduce(function (sum, chunk) { return sum + (chunk && chunk.size === 2 ? 2 : 1); }, 0);
        if (spelled === word && covered === sounds.length) return kept;
      }
      try { return core.alignGraphemes(word, sounds) || null; } catch (_) { return null; }
    };

    function open(host, word, options) {
      var opts = options || {};
      var id = 'wp-' + (++serial);
      var state = { entry: null, editing: false, rec: null, audio: null, gone: false };
      var panel = el('div', 'wp');
      panel.id = id;
      panel.setAttribute('role', 'group');
      panel.setAttribute('aria-labelledby', id + '-title');
      var head = el('div', 'wp-head');
      var title = el('h3', 'wp-title', fmt(TEXT.title, { word: word }));
      title.id = id + '-title';
      title.setAttribute('tabindex', '-1');
      var close = button(TEXT.close, 'btn-text', TEXT.close + ': ' + word);
      close.addEventListener('click', function () { if (typeof opts.onClose === 'function') opts.onClose(); });
      head.appendChild(title);
      head.appendChild(close);
      panel.appendChild(head);
      var notKeeping = el('p', 'wp-warn', TEXT.notKeeping);
      notKeeping.hidden = true;
      panel.appendChild(notKeeping);

      var part = function (name, key) {
        var box = el('section', 'wp-part');
        var heading = el('h4', '', name);
        heading.id = id + '-' + key;
        box.setAttribute('aria-labelledby', heading.id);
        box.appendChild(heading);
        var body = el('div', 'wp-body');
        box.appendChild(body);
        var said = el('p', 'wp-said');
        said.setAttribute('role', 'status');
        box.appendChild(said);
        panel.appendChild(box);
        return { inner: body, said: said };
      };
      var soundsPart = part(TEXT.sounds, 'sounds');
      var clipPart = part(TEXT.recording, 'clip');
      var picturePart = part(TEXT.picture, 'picture');
      host.appendChild(panel);

      // Nothing can be kept until the store has answered; then the parts are drawn again, never under the teacher's hands.
      var canKeep = false;
      keeping().then(function (ok) {
        canKeep = ok;
        notKeeping.hidden = ok;
        if (state.gone) return;
        if (!state.editing) drawSounds();
        if (!state.rec) drawClip();
        drawPicture();
      });
      var said = function (where, text) { where.said.textContent = ''; where.said.textContent = text || ''; };
      var put = function (patch, where, done) {
        if (!store) { said(where, TEXT.notKeeping); return Promise.resolve(null); }
        return store.put(word, patch).then(function (entry) {
          state.entry = entry;
          said(where, done);
          return entry;
        }, function (error) { said(where, (error && error.message) || TEXT.notKeeping); return null; });
      };

      // --- Sounds ------------------------------------------------------------------------------------
      var dictionary = function () { try { return core.dictionarySounds(word); } catch (_) { return null; } };
      function drawSounds(focusName) {
        var body = soundsPart.inner;
        body.textContent = '';
        var entry = state.entry, mine = entry && entry.sounds, dict = dictionary();
        var sounds = mine ? mine.sounds : dict ? dict.sounds : null;
        if (sounds && sounds.length) {
          var chunks = spellingFor(word, sounds, mine && mine.spelling);
          var split = el('ol', 'wp-split');
          split.setAttribute('aria-label', 'How ' + word + ' splits into sounds');
          if (chunks) {
            chunks.forEach(function (chunk) {
              var item = el('li');
              item.appendChild(el('span', 'wp-letters', chunk.text));
              var mineSounds = sounds.slice(chunk.start, chunk.start + (chunk.size === 2 ? 2 : 1));
              var sound = el('span', 'wp-sound');
              sound.appendChild(el('span', 'sr-only', 'sound '));
              sound.appendChild(doc.createTextNode(mineSounds.map(soundName).join(' + ')));
              item.appendChild(sound);
              split.appendChild(item);
            });
          } else {
            sounds.forEach(function (label) {
              var item = el('li');
              var sound = el('span', 'wp-sound');
              sound.appendChild(el('span', 'sr-only', 'sound '));
              sound.appendChild(doc.createTextNode(soundName(label)));
              item.appendChild(sound);
              split.appendChild(item);
            });
          }
          body.appendChild(split);
          var lines = [mine ? TEXT.yours : TEXT.fromDictionary];
          if (mine && dict && dict.sounds.join(' ') !== mine.sounds.join(' ')) lines.push(fmt(TEXT.dictionaryHas, { list: dict.sounds.map(soundName).join(', ') }));
          if (!chunks) lines.push(TEXT.noLetters);
          body.appendChild(el('p', 'wp-line', lines.join(' ')));
        } else body.appendChild(el('p', 'wp-line', TEXT.notInDictionary));
        var row = el('p', 'wp-row');
        var change = button(sounds && sounds.length ? TEXT.change : TEXT.set);
        change.setAttribute('data-wp', 'change-sounds');
        change.disabled = !canKeep;
        change.addEventListener('click', openEditor);
        row.appendChild(change);
        if (mine) {
          var back = button(dict ? TEXT.backToDictionary : TEXT.removeSounds);
          back.setAttribute('data-wp', 'remove-sounds');
          back.addEventListener('click', function () {
            put({ sounds: null }, soundsPart, dict ? TEXT.removedSounds : TEXT.removedSoundsNone).then(function () { drawSounds('change-sounds'); });
          });
          row.appendChild(back);
        }
        body.appendChild(row);
        if (focusName) { var target = body.querySelector('[data-wp="' + focusName + '"]'); if (target) target.focus(); }
      }

      function openEditor() {
        state.editing = true;
        var body = soundsPart.inner;
        body.textContent = '';
        said(soundsPart, '');
        var entry = state.entry, dict = dictionary();
        var start = entry && entry.sounds ? entry.sounds.sounds.slice() : dict ? dict.sounds.slice() : guessSounds(word, inventory);
        var guessed = !(entry && entry.sounds) && !dict;
        var list = start.length ? start : ['a'];
        var lettersTouched = false;
        var form = el('div', 'wp-editor');
        form.appendChild(el('p', 'hint', guessed ? TEXT.firstGuess : TEXT.editorHint));
        var picks = el('ol', 'wp-picks');
        form.appendChild(picks);
        var add = button(TEXT.addSound, 'btn-text');
        form.appendChild(add);
        var letterId = id + '-letters', hintId = id + '-letters-hint';
        var field = el('div', 'field wp-field');
        var label = el('label', '', TEXT.letters);
        label.setAttribute('for', letterId);
        var hint = el('span', 'hint');
        hint.id = hintId;
        var input = el('input');
        input.type = 'text';
        input.id = letterId;
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocapitalize', 'none');
        input.setAttribute('spellcheck', 'false');
        input.setAttribute('aria-describedby', hintId);
        field.appendChild(label);
        field.appendChild(hint);
        field.appendChild(input);
        form.appendChild(field);
        var problem = el('p', 'wp-problem');
        problem.setAttribute('role', 'alert');
        form.appendChild(problem);
        var row = el('p', 'wp-row');
        var keep = button(TEXT.keepSounds, 'btn-primary');
        keep.setAttribute('data-wp', 'keep-sounds');
        var cancel = button(TEXT.cancel);
        row.appendChild(keep);
        row.appendChild(cancel);
        form.appendChild(row);
        body.appendChild(form);

        var suggest = function () {
          var chunks = spellingFor(word, list, entry && entry.sounds && entry.sounds.spelling && list.join(' ') === entry.sounds.sounds.join(' ') ? entry.sounds.spelling : null);
          var text = chunks ? chunks.map(function (chunk) { return chunk.text; }).join(' ') : '';
          hint.textContent = chunks ? fmt(TEXT.lettersHint, { example: text }) : TEXT.lettersUnknown;
          if (!lettersTouched) input.value = text;
        };
        var drawPicks = function (focusAt) {
          picks.textContent = '';
          list.forEach(function (labelNow, index) {
            var item = el('li');
            var selectId = id + '-sound-' + index;
            var name = el('label', 'sr-only', fmt(TEXT.soundN, { n: index + 1 }));
            name.setAttribute('for', selectId);
            var select = el('select');
            select.id = selectId;
            groups.forEach(function (group) {
              var box = doc.createElement('optgroup');
              box.label = group[0];
              group[1].forEach(function (row) {
                var option = el('option', '', describe(row[0]));
                option.value = row[0];
                box.appendChild(option);
              });
              select.appendChild(box);
            });
            select.value = labelNow;
            select.addEventListener('change', function () { list[index] = select.value; suggest(); });
            var remove = button(String.fromCharCode(215), 'wp-x', fmt(TEXT.removeSoundN, { n: index + 1 }));
            remove.disabled = list.length < 2;
            remove.addEventListener('click', function () {
              list.splice(index, 1);
              drawPicks(Math.min(index, list.length - 1));
              suggest();
            });
            item.appendChild(name);
            item.appendChild(select);
            item.appendChild(remove);
            picks.appendChild(item);
          });
          add.disabled = list.length >= (limits.sounds || 24);
          if (focusAt != null && focusAt >= 0) { var target = picks.querySelectorAll('select')[focusAt]; if (target) target.focus(); }
        };
        add.addEventListener('click', function () {
          list.push(list[list.length - 1] || 'a');
          drawPicks(list.length - 1);
          suggest();
        });
        input.addEventListener('input', function () { lettersTouched = true; problem.textContent = ''; });
        cancel.addEventListener('click', function () { state.editing = false; drawSounds('change-sounds'); });
        keep.addEventListener('click', function () {
          var spelling = readLetters();
          if (!spelling) { input.focus(); return; }
          keep.disabled = true;
          put({ sounds: { sounds: list.slice(), spelling: spelling } }, soundsPart, TEXT.keptSounds).then(function (stored) {
            keep.disabled = false;
            if (!stored) return;
            state.editing = false;
            drawSounds('change-sounds');
          });
        });
        // The groups the teacher typed, checked: letters only, they spell the word, one for each sound
        // (or the aligner's own split, where it gives one spelling to two sounds, as x in box).
        var readLetters = function () {
          problem.textContent = '';
          if (!list.length) { problem.textContent = TEXT.needSound; return null; }
          if (list.length > (limits.sounds || 24)) { problem.textContent = fmt(TEXT.tooManySounds, { n: limits.sounds || 24 }); return null; }
          var groupsTyped = String(input.value || '').toLowerCase().trim().split(/[\s,.|\/-]+/).filter(Boolean);
          if (!groupsTyped.length || !groupsTyped.every(function (g) { return /^[a-z]{1,6}$/.test(g); })) { problem.textContent = TEXT.lettersOnly; return null; }
          var spelled = groupsTyped.join('');
          if (spelled !== word) { problem.textContent = fmt(TEXT.mustSpell, { word: word, spelled: spelled }); return null; }
          var aligned = spellingFor(word, list, null);
          if (aligned && aligned.map(function (chunk) { return chunk.text; }).join(' ') === groupsTyped.join(' ')) {
            return aligned.map(function (chunk) { var row = { text: chunk.text, start: chunk.start, size: chunk.size === 2 ? 2 : 1, at: chunk.at }; if (chunk.silentE) row.silentE = true; return row; });
          }
          if (groupsTyped.length !== list.length) { problem.textContent = fmt(TEXT.oneGroupEach, { sounds: count(list.length, 'sound'), groups: count(groupsTyped.length, 'group') }); return null; }
          var at = 0;
          return groupsTyped.map(function (text, index) { var row = { text: text, start: index, size: 1, at: at }; at += text.length; return row; });
        };
        drawPicks(0);
        suggest();
      }

      // --- Recording ---------------------------------------------------------------------------------
      var stopAudio = function () { if (state.audio) { try { state.audio.pause(); } catch (_) {} state.audio = null; } };
      var play = function (getUri) {
        stopAudio();
        return Promise.resolve().then(getUri).then(function (uri) {
          if (!uri) { said(clipPart, TEXT.cannotPlay); return; }
          var start = function (address) {
            var Player = root.Audio;
            if (typeof Player !== 'function') return Promise.reject(new Error('no player'));
            var audio = new Player(address);
            state.audio = audio;
            var going = audio.play();
            return going && typeof going.then === 'function' ? going : Promise.resolve();
          };
          return start(uri).then(null, function () {
            // WebM does not play in every browser: the same sound as WAV does.
            return typeof env.playable === 'function' ? env.playable(uri).then(start) : Promise.reject(new Error('cannot play'));
          }).then(null, function () { said(clipPart, TEXT.cannotPlay); });
        }, function () { said(clipPart, TEXT.cannotPlay); });
      };
      var releaseMicrophone = function () {
        var rec = state.rec;
        if (!rec) return;
        if (rec.timer) { clearTimeout(rec.timer); rec.timer = 0; }
        if (rec.stream) { try { rec.stream.getTracks().forEach(function (track) { track.stop(); }); } catch (_) {} rec.stream = null; }
      };
      var endRecording = function () {
        var rec = state.rec;
        if (!rec) return;
        rec.cancelled = true;
        try { if (rec.recorder && rec.recorder.state !== 'inactive') rec.recorder.stop(); } catch (_) {}
        releaseMicrophone();
        state.rec = null;
      };
      function drawClip(focusName) {
        var body = clipPart.inner;
        body.textContent = '';
        var entry = state.entry, mine = entry && entry.clip, bank = typeof env.bankNote === 'function' ? env.bankNote(word) : '';
        var rec = state.rec;
        var row = el('p', 'wp-row');
        if (rec && rec.stage === 'recording') {
          body.appendChild(el('p', 'wp-line', TEXT.recordingNow));
          var stop = button(TEXT.stop, 'btn-primary');
          stop.setAttribute('data-wp', 'stop');
          stop.addEventListener('click', function () { if (state.rec && state.rec.recorder && state.rec.recorder.state !== 'inactive') state.rec.recorder.stop(); });
          row.appendChild(stop);
        } else if (rec && (rec.stage === 'asking' || rec.stage === 'working')) {
          body.appendChild(el('p', 'wp-line', rec.stage === 'asking' ? TEXT.asking : TEXT.working));
        } else if (rec && rec.stage === 'review') {
          body.appendChild(el('p', 'wp-line', TEXT.review + ' ' + fmt(TEXT.reviewLength, { s: (rec.ms / 1000).toFixed(1) })));
          var listen = button(TEXT.play);
          listen.setAttribute('data-wp', 'play-new');
          listen.addEventListener('click', function () { play(function () { return rec.uri; }); });
          var keepIt = button(TEXT.keep, 'btn-primary');
          keepIt.setAttribute('data-wp', 'keep-clip');
          keepIt.disabled = !canKeep;
          keepIt.addEventListener('click', function () {
            keepIt.disabled = true;
            put({ clip: { dataUri: rec.uri, source: 'teacher', made: new Date().toISOString(), ms: rec.ms } }, clipPart, TEXT.keptRecording).then(function (stored) {
              if (!stored) { keepIt.disabled = false; return; }
              state.rec = null;
              drawClip('record');
            });
          });
          var again = button(TEXT.recordAgain);
          again.addEventListener('click', function () { state.rec = null; record(); });
          var cancel = button(TEXT.cancel, 'btn-text');
          cancel.addEventListener('click', function () { state.rec = null; said(clipPart, ''); drawClip('record'); });
          [listen, keepIt, again, cancel].forEach(function (node) { row.appendChild(node); });
        } else {
          body.appendChild(el('p', 'wp-line', mine ? fmt(TEXT.yourRecording, { s: ((Number(mine.ms) || 0) / 1000).toFixed(1) }) : bank ? TEXT.bankRecording : TEXT.noRecording));
          if (mine || bank) {
            var hear = button(TEXT.play);
            hear.setAttribute('data-wp', 'play');
            hear.setAttribute('aria-label', TEXT.play + ': ' + word);
            hear.addEventListener('click', function () {
              play(mine ? function () { return mine.dataUri; } : function () { return env.bankClip(word, function (mb) { said(clipPart, fmt(TEXT.gettingSounds, { mb: mb })); }); });
            });
            row.appendChild(hear);
          }
          var start = button(mine ? TEXT.recordAgain : TEXT.record);
          start.setAttribute('data-wp', 'record');
          start.setAttribute('aria-describedby', id + '-record-note');
          start.disabled = !canKeep;
          start.addEventListener('click', record);
          row.appendChild(start);
          if (mine) {
            var remove = button(TEXT.removeRecording);
            remove.setAttribute('data-wp', 'remove-clip');
            remove.addEventListener('click', function () { stopAudio(); put({ clip: null }, clipPart, TEXT.removedRecording).then(function () { drawClip('record'); }); });
            row.appendChild(remove);
          }
        }
        body.appendChild(row);
        var note = el('p', 'hint wp-note', TEXT.recordNote);
        note.id = id + '-record-note';
        body.appendChild(note);
        if (focusName) { var target = body.querySelector('[data-wp="' + focusName + '"]'); if (target) target.focus(); }
      }
      // Asks for the microphone only now, when the teacher has pressed Record.
      function record() {
        stopAudio();
        said(clipPart, '');
        var media = root.navigator && root.navigator.mediaDevices;
        if (!media || typeof media.getUserMedia !== 'function' || typeof root.MediaRecorder !== 'function') { said(clipPart, TEXT.cannotRecord); drawClip('record'); return; }
        var rec = { stage: 'asking', chunks: [], cancelled: false, timer: 0, stream: null, recorder: null };
        state.rec = rec;
        drawClip();
        var asked;
        try { asked = media.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }); } catch (error) { asked = Promise.reject(error); }
        Promise.resolve(asked).then(function (stream) {
          if (rec.cancelled || state.rec !== rec) { try { stream.getTracks().forEach(function (track) { track.stop(); }); } catch (_) {} return; }
          rec.stream = stream;
          var recorder;
          try { recorder = new root.MediaRecorder(stream); } catch (error) { releaseMicrophone(); state.rec = null; said(clipPart, TEXT.cannotRecord); drawClip('record'); return; }
          rec.recorder = recorder;
          recorder.ondataavailable = function (event) { if (event && event.data && event.data.size) rec.chunks.push(event.data); };
          recorder.onstop = function () {
            releaseMicrophone();
            if (rec.cancelled || state.rec !== rec) return;
            rec.stage = 'working';
            drawClip();
            var blob = new root.Blob(rec.chunks, { type: (rec.chunks[0] && rec.chunks[0].type) || recorder.mimeType || 'audio/webm' });
            readBlob(blob).then(decodeRecording).then(function (samples) {
              if (state.rec !== rec) return;
              var spoken = trimSilence(samples, RATE);
              if (!spoken) { state.rec = null; said(clipPart, TEXT.nothingHeard); drawClip('record'); return; }
              rec.uri = encodeWav(spoken, RATE);
              rec.ms = Math.round(spoken.length / RATE * 1000);
              rec.stage = 'review';
              drawClip('play-new');
            }, function () {
              if (state.rec !== rec) return;
              state.rec = null;
              said(clipPart, TEXT.cannotRead);
              drawClip('record');
            });
          };
          recorder.start();
          rec.stage = 'recording';
          rec.timer = setTimeout(function () { if (recorder.state !== 'inactive') recorder.stop(); }, RECORD_MS);
          drawClip('stop');
        }, function (error) {
          if (state.rec !== rec) return;
          state.rec = null;
          var name = error && error.name;
          said(clipPart, name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError' ? TEXT.notAllowed
            : name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError' ? TEXT.noMicrophone
              : name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError' ? TEXT.micBusy : TEXT.cannotRecord);
          drawClip('record');
        });
      }
      function readBlob(blob) {
        if (blob && typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
        return new Promise(function (resolve, reject) {
          if (typeof root.FileReader !== 'function') { reject(new Error('no reader')); return; }
          var reader = new root.FileReader();
          reader.onload = function () { resolve(reader.result); };
          reader.onerror = function () { reject(reader.error); };
          reader.readAsArrayBuffer(blob);
        });
      }

      // --- Picture -----------------------------------------------------------------------------------
      var chooser = el('input');
      chooser.type = 'file';
      chooser.accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml';
      chooser.hidden = true;
      chooser.setAttribute('aria-hidden', 'true');
      chooser.tabIndex = -1;
      chooser.setAttribute('data-wp', 'picture-file');
      chooser.addEventListener('change', function () {
        var file = chooser.files && chooser.files[0];
        chooser.value = '';
        if (!file) return;
        var helper = root.AlloPacketMyWords;
        if (!store || !helper || typeof helper.resizeToDataUri !== 'function') { said(picturePart, TEXT.notKeeping); return; }
        said(picturePart, TEXT.readingPicture);
        helper.resizeToDataUri(file).then(function (uri) {
          return put({ picture: { dataUri: uri, credit: { own: true } } }, picturePart, TEXT.keptPicture);
        }, function (error) { said(picturePart, (error && error.message) || TEXT.cannotRead); return null; }).then(function () { drawPicture('use-picture'); });
      });
      panel.appendChild(chooser);
      function drawPicture(focusName) {
        var body = picturePart.inner;
        body.textContent = '';
        var entry = state.entry, mine = entry && entry.picture;
        if (mine) {
          var figure = el('div', 'wp-picture');
          var image = el('img');
          image.src = mine.dataUri;
          image.alt = fmt(TEXT.pictureAlt, { word: word });
          figure.appendChild(image);
          var helper = root.AlloPacketMyWords;
          var line = mine.credit && mine.credit.own === true ? TEXT.yourPicture : helper && typeof helper.creditLine === 'function' ? helper.creditLine(mine.credit) : '';
          figure.appendChild(el('p', 'wp-line', line));
          body.appendChild(figure);
        } else body.appendChild(el('p', 'wp-line', env.symbols && typeof env.symbols.has === 'function' && env.symbols.has(word) ? TEXT.symbol : TEXT.noPicture));
        var row = el('p', 'wp-row');
        var choose = button(TEXT.usePicture);
        choose.setAttribute('data-wp', 'use-picture');
        choose.setAttribute('aria-describedby', id + '-picture-note');
        choose.disabled = !canKeep;
        choose.addEventListener('click', function () { chooser.click(); });
        row.appendChild(choose);
        var find = el('a', 'btn btn-small', TEXT.findPicture);
        find.href = (env.picturesPage || PICTURES_PAGE) + '#word=' + word;
        find.target = '_blank';
        find.rel = 'noopener';
        find.setAttribute('data-wp', 'find-picture');
        find.appendChild(el('span', 'sr-only', ' ' + TEXT.newTab));
        row.appendChild(find);
        if (mine) {
          var remove = button(TEXT.removePicture);
          remove.setAttribute('data-wp', 'remove-picture');
          remove.addEventListener('click', function () { put({ picture: null }, picturePart, TEXT.removedPicture).then(function () { drawPicture('use-picture'); }); });
          row.appendChild(remove);
        }
        body.appendChild(row);
        var note = el('p', 'hint', TEXT.pictureNote);
        note.id = id + '-picture-note';
        body.appendChild(note);
        if (focusName) { var target = body.querySelector('[data-wp="' + focusName + '"]'); if (target) target.focus(); }
      }

      drawSounds();
      drawClip();
      drawPicture();
      return {
        root: panel,
        word: word,
        // The entry changed (here, or in another tab): redraw, but never under the teacher's hands.
        update: function (entry) {
          state.entry = isObject(entry) ? entry : null;
          if (state.gone) return;
          if (!state.editing) drawSounds();
          if (!state.rec) drawClip();
          drawPicture();
        },
        busy: function () { return state.editing || !!state.rec; },
        focus: function () { title.focus(); },
        destroy: function () {
          state.gone = true;
          stopAudio();
          endRecording();
          if (panel.parentNode) panel.parentNode.removeChild(panel);
        },
      };
    }
    return { open: open };
  }

  var api = { create: create, trimSilence: trimSilence, encodeWav: encodeWav, resample: resample, guessSounds: guessSounds, decodeRecording: decodeRecording,
    RECORD_MS: RECORD_MS, RATE: RATE, TEXT: TEXT };
  if (root) root.AlloPacketWordPanel = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
