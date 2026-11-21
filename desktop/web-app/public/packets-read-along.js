// "Make a read-along" (packets-read-along.html): a passage becomes one file that reads it aloud, one sentence at
// a time, with the sentence highlighted — or a reading file with Syllables and Reading tools without recordings.
// One of the two Packets pages that use the AI voice, and only after the teacher asks.
//
// It builds nothing of its own:
//   - the computer voice is started and its sound is taken by packets_voice_engine.js, which runs the app's own loader
//     and the app's own MP3 encoder (shared with Make recordings with a computer voice);
//   - optional teacher microphone recording runs only when Record is pressed on a sentence, trims silence, and uses the
//     same MP3 encoder (with WAV fallback) inside this browser tab;
//   - the passage is split and the file is made (and read back on reopen) by packet_read_along_builder.js, through the
//     engine every other student file uses (word_sounds_take_home_loader.js, its read_along activity);
//   - the syllable breaks for the file's Syllables button are looked up in the app's own English syllable table
//     (syllable_table_en.js), and only the breaks it is sure of are used.
// The passage and the recordings live in this tab's memory only. The saved file plays recordings; it has no AI.
(function () {
  'use strict';
  var doc = document, win = window;
  var $ = function (id) { return doc.getElementById(id); };
  var engine = win.AlloPacketVoiceEngine || null, builder = win.AlloPacketReadAlong || null, loader = win.AlloWordSoundsTakeHome || null;
  var TRY_PAGE = 'packets-try.html', MP3_KBPS = 64, MIC_RATE = 22050, RECORD_MS = 30000, MAX_STUDENTS = 40;
  var MAX_REOPEN_BYTES = 60 * 1024 * 1024;
  var MAX_ROSTER_BYTES = 256 * 1024;
  // The app's English syllable table. A word it marks "check" (it is not sure of the break) is left whole.
  var table = (win.AlloModules && win.AlloModules.SyllableTableEn) || null;
  function syllablesOf(word) { var found = table ? table.lookup(word) : null; return found && !found.check ? found.parts : null; }
  function tableSource() { var src = table && table.source ? table.source : null; return src ? [src.moby, src.cmudict].filter(function (v) { return typeof v === 'string' && v; }).join('; checked against ') : ''; }
  // clips: { "the sentence": { uri, ms, voice, source } }, by the builder's key for a sentence.
  var state = { sentences: [], total: 0, clips: Object.create(null), hiddenPics: Object.create(null), ready: false, getting: false, making: false, stop: null, makeRun: 0, mp3: false, playing: null, rec: null, built: null, baseHtml: '', made: null, fileUrl: '', unsaved: false };
  var buildTimer = 0;
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
  function fileSize(bytes) { return bytes >= 1e6 ? (bytes / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1000)) + ' KB'; }
  function said(error) { return String((error && error.message) || error || ''); }

  function keyOf(row) { return builder.clipKey(row.text); }
  function clipOf(row) { var key = keyOf(row); return Object.prototype.hasOwnProperty.call(state.clips, key) ? state.clips[key] : null; }
  function needing() { return state.sentences.filter(function (row) { return !clipOf(row); }); }
  function pageMode() {
    var sel = $('f-page-mode');
    var v = sel ? sel.value : 'auto';
    return typeof builder.cleanPageMode === 'function' ? builder.cleanPageMode(v) : (v === 'scroll' || v === 'custom' ? v : 'auto');
  }
  function passageLang() {
    var sel = $('f-lang');
    var v = sel ? sel.value : 'en';
    return typeof builder.cleanLang === 'function' ? builder.cleanLang(v) : 'en';
  }
  function isEnglish() { return /^en(?:-|$)/i.test(passageLang()); }
  function isSpanish() { return /^es(?:-|$)/i.test(passageLang()); }
  function usePos() { return isEnglish() && !!($('f-pos') && $('f-pos').checked); }
  function useDict() { return isEnglish() && !!($('f-dict') && $('f-dict').checked); }
  function useDictPics() { return isEnglish() && !!($('f-dict-pics') && $('f-dict-pics').checked); }
  function useSimpleBar() { return !!($('f-simple-bar') && $('f-simple-bar').checked); }
  function useStudentMic() { return !!($('f-student-mic') && $('f-student-mic').checked); }
  function useDeviceVoice() { return !!($('f-device-voice') && $('f-device-voice').checked); }
  var dictLoading = null, picsLoading = null, symbolBank = null, loadedPicShards = Object.create(null), myPics = Object.create(null), myWordsWatched = false;
  function loadOptionalScript(src, present) {
    if (present) return Promise.resolve(true);
    return new Promise(function (resolve) {
      var script = doc.createElement('script');
      script.src = src;
      script.onload = function () { resolve(true); };
      script.onerror = function () { resolve(false); };
      doc.head.appendChild(script);
    });
  }
  function passageWordsList() {
    var seen = Object.create(null), out = [];
    state.sentences.forEach(function (row) {
      var re = /[A-Za-z]{3,}/g, m;
      while ((m = re.exec(String(row.text || '')))) {
        var k = m[0].toLowerCase();
        if (!seen[k]) { seen[k] = true; out.push(k); }
      }
    });
    return out;
  }
  function syncMyPictures() {
    var store = win.AlloPacketMyWords;
    if (!store || typeof store.getMany !== 'function') return Promise.resolve(false);
    var words = passageWordsList();
    if (!words.length) return Promise.resolve(true);
    return Promise.resolve(store.getMany(words)).then(function (found) {
      myPics = Object.create(null);
      if (found && typeof found === 'object') {
        Object.keys(found).forEach(function (k) {
          var pic = found[k] && found[k].picture;
          if (pic && typeof pic.dataUri === 'string' && /^data:image\//i.test(pic.dataUri)) {
            var credit = typeof store.creditLine === 'function' ? store.creditLine(pic.credit) : '';
            myPics[k] = { uri: pic.dataUri, label: k, set: 'teacher', credit: credit };
          }
        });
      }
      return true;
    }, function () { return false; });
  }
  function svgToDataUri(svg) {
    if (typeof svg !== 'string' || !svg.trim()) return '';
    try {
      var bytes = typeof win.TextEncoder === 'function' ? new win.TextEncoder().encode(svg) : null;
      if (bytes) {
        var bin = '';
        for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return 'data:image/svg+xml;base64,' + win.btoa(bin);
      }
      return 'data:image/svg+xml;base64,' + win.btoa(unescape(encodeURIComponent(svg)));
    } catch (_) { return ''; }
  }
  function getPictureMatcher() {
    return win.AlloWordPictureMatcher || (win.AlloModules && win.AlloModules.WordPictureMatcher) || null;
  }
  function picLookup(word, defEntry, opts) {
    var k = String(word || '').toLowerCase();
    if (!k || (state.hiddenPics && state.hiddenPics[k])) return null;
    // 1. Teacher's own saved picture (Find a picture / AlloPacketMyWords / inline Replace) always wins.
    if (Object.prototype.hasOwnProperty.call(myPics, k) && myPics[k]) return myPics[k];
    // 2. Exact match in bundled Mulberry Symbols / OpenMoji bank.
    if (symbolBank && typeof symbolBank.get === 'function') {
      var exact = symbolBank.get(k);
      if (exact && typeof exact.svg === 'string') {
        var exactUri = svgToDataUri(exact.svg);
        if (exactUri) return { uri: exactUri, label: exact.label || k, set: exact.set || 'mulberry' };
      }
    }
    // 3. Offline WordPictureMatcher: 696 K-12 curriculum SVG diagrams, 213 concept cues, irregular lemmas, compounds, and definition fallback.
    var matcher = getPictureMatcher();
    if (opts && opts.phraseOnly) {
      if (matcher && typeof matcher.getDiagram === 'function') {
        var pDiag = null;
        try { pDiag = matcher.getDiagram(k, '', k); } catch (_) { pDiag = null; }
        if (pDiag && typeof pDiag.svg === 'string') {
          var pUri = svgToDataUri(pDiag.svg);
          if (pUri) return { uri: pUri, label: pDiag.alt || pDiag.label || k, set: pDiag.set || 'diagram' };
        }
      }
      return null;
    }
    if (matcher && typeof matcher.matchWord === 'function') {
      var lemma = (defEntry && defEntry.word) || '';
      var defText = (defEntry && defEntry.def) || '';
      var matched = null;
      try {
        matched = matcher.matchWord({ word: k, lemma: lemma, definition: defText }, { symbols: symbolBank || null, preferDiagrams: true });
      } catch (_) { matched = null; }
      if (matched && typeof matched.svg === 'string') {
        var mUri = svgToDataUri(matched.svg);
        if (mUri) return { uri: mUri, label: matched.alt || matched.label || k, set: matched.set || (matched.matchType === 'diagram' ? 'diagram' : 'mulberry') };
      }
    }
    return null;
  }
  var picUploadInput = null, picUploadWord = '';
  var MAX_PIC_UPLOAD_BYTES = 25 * 1024 * 1024;
  var MAX_RAW_PIC_FALLBACK_BYTES = 210 * 1024;
  function replacePictureFile(wordKey, file) {
    if (!wordKey || !file) return;
    var store = win.AlloPacketMyWords;
    var hasResizer = !!(store && typeof store.resizeToDataUri === 'function');
    var fileSizeBytes = Number(file.size || 0);
    if (fileSizeBytes > MAX_PIC_UPLOAD_BYTES || (!hasResizer && fileSizeBytes > MAX_RAW_PIC_FALLBACK_BYTES)) {
      setText('pics-said', 'Choose a smaller PNG, JPG, or WebP picture.');
      return;
    }
    if (!hasResizer && (/svg/i.test(String(file.type || '')) || /\.svg$/i.test(String(file.name || '')))) {
      setText('pics-said', 'Choose a PNG, JPG, or WebP picture.');
      return;
    }
    var readUri = hasResizer
      ? Promise.resolve().then(function () { return store.resizeToDataUri(file); })
      : new Promise(function (resolve, reject) {
          if (typeof win.FileReader !== 'function') { reject(new Error('no reader')); return; }
          var r = new win.FileReader();
          r.onload = function () { resolve(String(r.result || '')); };
          r.onerror = function () { reject(new Error('read failed')); };
          r.readAsDataURL(file);
        });
    readUri.then(function (uri) {
      var allowedPattern = hasResizer
        ? /^data:image\/(?:svg\+xml|png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/
        : /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;
      if (typeof uri !== 'string' || !allowedPattern.test(uri) || uri.length > 280 * 1024) {
        setText('pics-said', hasResizer ? 'Choose a smaller PNG, JPG, WebP, or SVG picture.' : 'Choose a smaller PNG, JPG, or WebP picture.');
        return;
      }
      myPics[wordKey] = { uri: uri, label: wordKey, set: 'teacher', credit: '' };
      if (state.hiddenPics) delete state.hiddenPics[wordKey];
      state.unsaved = true;
      if (store && typeof store.put === 'function' && wordKey.indexOf(' ') < 0) {
        Promise.resolve().then(function () { return store.put(wordKey, { picture: { dataUri: uri, credit: { own: true } } }); }).catch(function () {});
      }
      refreshFile();
    }, function () {
      setText('pics-said', 'Could not read that picture file. Try a PNG, JPG, or SVG.');
    });
  }
  function triggerReplacePicture(wordKey) {
    if (!wordKey) return;
    picUploadWord = wordKey;
    if (!picUploadInput) {
      picUploadInput = doc.createElement('input');
      picUploadInput.type = 'file';
      picUploadInput.accept = 'image/*';
      picUploadInput.hidden = true;
      picUploadInput.setAttribute('data-ra-pic-upload', '');
      picUploadInput.addEventListener('change', function () {
        var f = this.files && this.files[0];
        this.value = '';
        var target = picUploadWord;
        picUploadWord = '';
        if (f && target) replacePictureFile(target, f);
      });
      doc.body.appendChild(picUploadInput);
    }
    picUploadInput.value = '';
    picUploadInput.click();
  }
  function ensurePictures() {
    if (picsLoading) return picsLoading;
    setText('pics-said', 'Loading offline word pictures and curriculum diagrams...');
    picsLoading = Promise.all([
      loadOptionalScript('word_sounds_symbols_en.js', !!(symbolBank || typeof win.createWordSoundsSymbols === 'function')),
      loadOptionalScript('word_picture_matcher.js', !!getPictureMatcher()),
      loadOptionalScript('packets_my_words.js', !!win.AlloPacketMyWords),
    ]).then(function () {
      if (!symbolBank && typeof win.createWordSoundsSymbols === 'function') symbolBank = win.createWordSoundsSymbols();
      var store = win.AlloPacketMyWords;
      if (store && typeof store.onChange === 'function' && !myWordsWatched) {
        myWordsWatched = true;
        store.onChange(function () {
          if (useDictPics()) syncMyPictures().then(function () { refreshFile(); });
        });
      }
      var tasks = [syncMyPictures()];
      if (symbolBank && Array.isArray(symbolBank.shards) && !(symbolBank.ready && symbolBank.ready()) && typeof win.fetch === 'function') {
        var urls = symbolBank.shards.map(function (sh) { return sh.url; }).filter(function (u) { return !loadedPicShards[u]; });
        urls.forEach(function (u) {
          tasks.push(win.fetch(u).then(function (r) { return r && r.ok ? r.json() : null; }).then(function (data) {
            if (data && symbolBank) { symbolBank.add(data); loadedPicShards[u] = true; }
          }, function () {}));
        });
      }
      return Promise.all(tasks).then(function () { return true; });
    }).then(function () {
      picsLoading = null;
      return true;
    }, function () {
      picsLoading = null;
      setText('pics-said', 'Could not load offline word pictures right now. The file still builds without pictures.');
      return false;
    });
    return picsLoading;
  }
  function dictLookup(word) {
    var bank = win.AlloVocabBank;
    if (!bank || typeof bank.ready !== 'function' || !bank.ready()) return null;
    var list = bank.senses(word);
    if (!Array.isArray(list) || !list.length) return null;
    var s = list[0];
    return { word: s.word || bank.head(word) || word, pos: s.pos || '', def: s.def || '', example: s.example || '' };
  }
  function posLookup(word) {
    var bank = win.AlloVocabBank;
    if (!bank || typeof bank.ready !== 'function' || !bank.ready()) return null;
    var list = bank.senses(word);
    if (!Array.isArray(list) || !list.length) return null;
    return list.map(function (s) { return s && s.pos ? s.pos : ''; }).filter(Boolean);
  }
  function wavTimings(sentence, wav) {
    if (typeof builder.computeWordTimings !== 'function' || !wav || wav.length < 48) return null;
    try {
      var view = new DataView(wav.buffer, wav.byteOffset || 0, wav.byteLength || wav.length);
      var sr = view.getUint32(24, true);
      var ch = view.getUint16(22, true) || 1;
      var bits = view.getUint16(34, true) || 16;
      if (!(sr > 0) || bits !== 16) return null;
      var pos = 12, dataAt = -1, dataLen = 0;
      while (pos + 8 <= view.byteLength) {
        var tag = String.fromCharCode(view.getUint8(pos), view.getUint8(pos + 1), view.getUint8(pos + 2), view.getUint8(pos + 3));
        var len = view.getUint32(pos + 4, true);
        if (tag === 'data') { dataAt = pos + 8; dataLen = Math.min(len, view.byteLength - dataAt); break; }
        pos += 8 + len + (len & 1);
      }
      if (dataAt < 0 || dataLen < 4) return null;
      var frames = Math.floor(dataLen / (2 * ch));
      var mono = new Float32Array(frames);
      for (var i = 0; i < frames; i++) {
        var acc = 0;
        for (var c = 0; c < ch; c++) acc += view.getInt16(dataAt + (i * ch + c) * 2, true) / 32768;
        mono[i] = acc / ch;
      }
      return builder.computeWordTimings(sentence, mono, sr);
    } catch (_) { return null; }
  }
  function ensureDictionary() {
    var bank = win.AlloVocabBank;
    if (bank && typeof bank.ready === 'function' && bank.ready()) return Promise.resolve(true);
    if (dictLoading) return dictLoading;
    setText('dict-said', 'Loading offline dictionary...');
    var loadScript = bank ? Promise.resolve() : new Promise(function (resolve, reject) {
      var script = doc.createElement('script');
      script.src = 'packets_vocab_bank_en.js';
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Dictionary script did not arrive.')); };
      doc.head.appendChild(script);
    });
    dictLoading = loadScript.then(function () {
      if (!win.AlloVocabBank || typeof win.AlloVocabBank.load !== 'function') throw new Error('Dictionary did not load.');
      return win.AlloVocabBank.load();
    }).then(function () {
      dictLoading = null;
      setText('dict-said', 'Offline dictionary ready.');
      return true;
    }, function () {
      dictLoading = null;
      setText('dict-said', 'Could not load the offline dictionary right now. The file still builds without Word meanings.');
      return false;
    });
    return dictLoading;
  }
  function syncLangUi() {
    var en = isEnglish();
    var rtl = typeof builder.isRtlLang === 'function' && builder.isRtlLang(passageLang());
    if ($('f-text')) $('f-text').setAttribute('dir', rtl ? 'rtl' : 'ltr');
    if ($('f-pos')) $('f-pos').disabled = !en;
    if ($('f-dict')) $('f-dict').disabled = !en;
    if ($('f-dict-pics')) $('f-dict-pics').disabled = !en;
  }
  function pageGroups() { return builder.pagesOf(state.sentences, { pageMode: pageMode() }); }
  function pages() { return pageGroups().length; }
  function togglePageBreak(targetIndex, makeBreak) {
    if (state.making || state.rec || targetIndex <= 0 || targetIndex >= state.sentences.length) return;
    var groups = pageGroups();
    var starts = {};
    var cursor = 0;
    groups.forEach(function (g, gi) {
      if (gi > 0) starts[cursor] = true;
      cursor += g.length;
    });
    if (makeBreak) starts[targetIndex] = true;
    else delete starts[targetIndex];
    var rebuilt = '';
    for (var i = 0; i < state.sentences.length; i++) {
      if (i > 0) {
        if (starts[i]) rebuilt += '\n\n---\n\n';
        else if (state.sentences[i].para || state.sentences[i].heading || state.sentences[i - 1].heading) rebuilt += '\n\n';
        else if (/[.!?]["')\]]*$/.test(state.sentences[i - 1].text)) rebuilt += ' ';
        else rebuilt += '\n';
      }
      var prefix = state.sentences[i].heading ? (state.sentences[i].heading === 1 ? '# ' : state.sentences[i].heading === 2 ? '## ' : '### ') : '';
      rebuilt += prefix + state.sentences[i].text;
    }
    if ($('f-page-mode')) $('f-page-mode').value = 'custom';
    $('f-text').value = rebuilt;
    state.unsaved = true;
    syncLangUi();
    readPassage();
    draw();
    refreshFile();
  }

  function titleStem() {
    var stem = String(($('f-title') && $('f-title').value) || '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return stem || 'read-along';
  }
  function fileNameFor(code) {
    return titleStem() + (code ? '__' + code : '') + '.html';
  }

  // ---------------------------------------------------------------------------
  // Optional teacher mic recording helpers (mono 22050 Hz, silence-trimmed, 64 kbps MP3 via engine with WAV fallback)
  // ---------------------------------------------------------------------------
  function resample(samples, fromRate, toRate) {
    if (!samples || !samples.length || fromRate === toRate) return samples;
    var length = Math.max(1, Math.round(samples.length * toRate / fromRate));
    var out = new Float32Array(length), step = (samples.length - 1) / Math.max(1, length - 1);
    for (var i = 0; i < length; i++) {
      var at = i * step, low = Math.floor(at), high = Math.min(samples.length - 1, low + 1), frac = at - low;
      out[i] = samples[low] + (samples[high] - samples[low]) * frac;
    }
    return out;
  }
  function trimSilence(samples, rate) {
    if (!samples || !samples.length) return null;
    var peak = 0;
    for (var i = 0; i < samples.length; i++) { var a = Math.abs(samples[i]); if (a > peak) peak = a; }
    if (peak < 0.008) return null;
    var gate = Math.max(0.012, peak * 0.06), pad = Math.round(rate * 0.08);
    var start = 0, end = samples.length - 1;
    while (start < end && Math.abs(samples[start]) < gate) start++;
    while (end > start && Math.abs(samples[end]) < gate) end--;
    start = Math.max(0, start - pad);
    end = Math.min(samples.length, end + pad + 1);
    return end - start < Math.round(rate * 0.05) ? null : samples.slice(start, end);
  }
  function encodeWavBytes(samples, rate) {
    var bytes = new Uint8Array(44 + samples.length * 2), view = new DataView(bytes.buffer);
    var put = function (at, s) { for (var i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i); };
    put(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); put(8, 'WAVE');
    put(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    put(36, 'data'); view.setUint32(40, samples.length * 2, true);
    for (var i = 0; i < samples.length; i++) {
      var v = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(44 + i * 2, v < 0 ? Math.round(v * 32768) : Math.round(v * 32767), true);
    }
    return bytes;
  }
  function bytesToBase64(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return win.btoa(out);
  }
  function readBlobBuffer(blob) {
    if (blob && typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
    return new Promise(function (resolve, reject) {
      if (typeof win.FileReader !== 'function') { reject(new Error('no reader')); return; }
      var reader = new win.FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error || new Error('read failed')); };
      reader.readAsArrayBuffer(blob);
    });
  }
  function pickRecorderMime() {
    var MR = win.MediaRecorder;
    if (!MR || typeof MR.isTypeSupported !== 'function') return '';
    var list = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    for (var i = 0; i < list.length; i++) {
      try { if (MR.isTypeSupported(list[i])) return list[i]; } catch (_) {}
    }
    return '';
  }
  function decodeRecording(buffer) {
    var Offline = win.OfflineAudioContext || win.webkitOfflineAudioContext;
    var Live = win.AudioContext || win.webkitAudioContext;
    if (typeof Offline !== 'function' && typeof Live !== 'function') {
      return Promise.reject(new Error('This browser cannot read microphone recordings here.'));
    }
    var runDecode = function (makeCtx, isOffline) {
      return new Promise(function (resolve, reject) {
        var ctx;
        try { ctx = makeCtx(); } catch (err) { reject(err); return; }
        var settled = false;
        var close = function () { if (!isOffline && ctx && typeof ctx.close === 'function') { try { ctx.close(); } catch (_) {} } };
        var ok = function (decoded) { if (settled) return; settled = true; close(); resolve(decoded); };
        var no = function (err) { if (settled) return; settled = true; close(); reject(err || new Error('decode failed')); };
        try {
          var res = ctx.decodeAudioData(buffer.slice(0), ok, no);
          if (res && typeof res.then === 'function') res.then(ok, no);
        } catch (err) { no(err); }
      });
    };
    var decodedPromise = typeof Offline === 'function'
      ? runDecode(function () { return new Offline(1, 1, MIC_RATE); }, true)
        .then(null, function () { return runDecode(function () { return new Offline(1, 1, 44100); }, true); })
      : runDecode(function () { return new Live(); }, false);
    if (typeof Offline === 'function' && typeof Live === 'function') {
      decodedPromise = decodedPromise.then(null, function () { return runDecode(function () { return new Live(); }, false); });
    }
    return decodedPromise.then(function (decoded) {
      var length = decoded.length, channels = decoded.numberOfChannels || 1, mixed = new Float32Array(length);
      for (var c = 0; c < channels; c++) {
        var data = decoded.getChannelData(c);
        for (var i = 0; i < length; i++) mixed[i] += data[i] / channels;
      }
      return resample(mixed, decoded.sampleRate || MIC_RATE, MIC_RATE);
    });
  }
  function releaseMic() {
    var rec = state.rec;
    if (!rec) return;
    if (rec.timer) { win.clearTimeout(rec.timer); rec.timer = 0; }
    if (rec.stream) { try { rec.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (_) {} rec.stream = null; }
  }
  function cancelMic() {
    var rec = state.rec;
    if (!rec) return;
    rec.cancelled = true;
    try { if (rec.recorder && rec.recorder.state !== 'inactive') rec.recorder.stop(); } catch (_) {}
    releaseMic();
    state.rec = null;
  }

  // Click-gated: asks for the microphone only when the teacher presses Record on a sentence.
  function record(row, n) {
    if (state.making) return;
    var key = keyOf(row);
    if (state.rec && state.rec.key === key && state.rec.stage === 'recording') {
      try { if (state.rec.recorder && state.rec.recorder.state !== 'inactive') state.rec.recorder.stop(); } catch (_) {}
      return;
    }
    if (state.rec) return;
    try { if (state.playing) state.playing.pause(); } catch (_) {}
    setText('make-problem', '');
    var media = win.navigator && win.navigator.mediaDevices;
    if (!media || typeof media.getUserMedia !== 'function' || typeof win.MediaRecorder !== 'function') {
      setText('make-problem', 'This browser cannot record from a microphone here.');
      return;
    }
    var rec = { key: key, row: row, n: n, stage: 'asking', chunks: [], cancelled: false, timer: 0, stream: null, recorder: null };
    state.rec = rec;
    setText('make-said', 'Allow the microphone to record sentence ' + n + '.');
    draw();
    var asked;
    try { asked = media.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }); } catch (err) { asked = Promise.reject(err); }
    Promise.resolve(asked).then(function (stream) {
      if (rec.cancelled || state.rec !== rec) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (_) {} return; }
      rec.stream = stream;
      var mime = pickRecorderMime();
      var recorder;
      try { recorder = mime ? new win.MediaRecorder(stream, { mimeType: mime }) : new win.MediaRecorder(stream); } catch (_) {
        try { recorder = new win.MediaRecorder(stream); } catch (__) {
          releaseMic(); state.rec = null;
          setText('make-problem', 'This browser could not start microphone recording.');
          draw();
          return;
        }
      }
      rec.recorder = recorder;
      recorder.onerror = function () {
        releaseMic();
        if (state.rec !== rec) return;
        state.rec = null;
        setText('make-problem', 'This browser could not finish microphone recording. Try again.');
        draw();
      };
      recorder.ondataavailable = function (ev) { if (ev && ev.data && ev.data.size) rec.chunks.push(ev.data); };
      recorder.onstop = function () {
        releaseMic();
        if (rec.cancelled || state.rec !== rec) return;
        if (!rec.chunks.length) {
          state.rec = null;
          setText('make-problem', 'Nothing was heard for sentence ' + n + '. Speak closer to the microphone and try again.');
          draw();
          return;
        }
        rec.stage = 'working';
        setText('make-said', 'Finishing your recording for sentence ' + n + '.');
        draw();
        var blobType = (rec.chunks[0] && rec.chunks[0].type) || recorder.mimeType || mime || 'audio/webm';
        var blob = new win.Blob(rec.chunks, { type: blobType });
        readBlobBuffer(blob).then(decodeRecording).then(function (samples) {
          if (state.rec !== rec) return null;
          var spoken = trimSilence(samples, MIC_RATE);
          if (!spoken) {
            state.rec = null;
            setText('make-problem', 'Nothing was heard for sentence ' + n + '. Speak closer to the microphone and try again.');
            draw();
            return null;
          }
          var wav = encodeWavBytes(spoken, MIC_RATE);
          var ms = Math.round(spoken.length / MIC_RATE * 1000);
          var micTimings = typeof builder.computeWordTimings === 'function' ? builder.computeWordTimings(row.text, spoken, MIC_RATE) : null;
          var encode = state.mp3 ? Promise.resolve(true) : (engine && typeof engine.getMp3 === 'function' ? engine.getMp3() : Promise.resolve(false));
          return encode.then(function (hasMp3) {
            if (state.rec !== rec) return;
            if (hasMp3) state.mp3 = true;
            var mp3 = hasMp3 && engine && typeof engine.wavToMp3 === 'function' ? engine.wavToMp3(wav, MP3_KBPS) : null;
            var uri = mp3 ? engine.toDataUri(mp3, 'audio/mpeg') : ('data:audio/wav;base64,' + bytesToBase64(wav));
            if (uri.length > builder.MAX_CLIP_CHARS) {
              state.rec = null;
              setText('make-problem', 'That recording for sentence ' + n + ' is too long to keep. Try a shorter sentence.');
              draw();
              return;
            }
            state.clips[key] = { uri: uri, ms: ms, voice: '', source: 'teacher', timings: micTimings };
            state.unsaved = true;
            state.rec = null;
            var autoNext = !!($('auto-advance-rec') && $('auto-advance-rec').checked);
            var nextUnrec = 0;
            if (autoNext) {
              for (var ni = n; ni < state.sentences.length; ni++) {
                if (!clipOf(state.sentences[ni])) { nextUnrec = ni + 1; break; }
              }
              if (!nextUnrec) {
                for (var nj = 0; nj < n - 1; nj++) {
                  if (!clipOf(state.sentences[nj])) { nextUnrec = nj + 1; break; }
                }
              }
            }
            draw();
            setText('make-said', 'Recorded sentence ' + n + ' with your voice.' + (nextUnrec ? ' Ready to record sentence ' + nextUnrec + '.' : ''));
            refreshFile();
            var focus = nextUnrec
              ? doc.querySelector('[data-record="' + nextUnrec + '"]')
              : (doc.querySelector('[data-play="' + n + '"]') || doc.querySelector('[data-record="' + n + '"]'));
            if (focus) {
              if (nextUnrec && typeof focus.scrollIntoView === 'function') { try { focus.scrollIntoView({ block: 'nearest' }); } catch (_) {} }
              focus.focus();
            }
          });
        }, function () {
          if (state.rec !== rec) return;
          state.rec = null;
          setText('make-problem', 'This browser could not read that recording. Try again.');
          draw();
        });
      };
      try {
        recorder.start();
      } catch (_) {
        releaseMic();
        if (state.rec === rec) state.rec = null;
        setText('make-problem', 'This browser could not start microphone recording.');
        draw();
        return;
      }
      rec.stage = 'recording';
      rec.timer = win.setTimeout(function () { if (recorder.state !== 'inactive') recorder.stop(); }, RECORD_MS);
      setText('make-said', 'Recording sentence ' + n + '. Press Stop when you finish.');
      draw();
      var stopBtn = doc.querySelector('[data-record="' + n + '"]');
      if (stopBtn) stopBtn.focus();
    }, function (error) {
      if (state.rec !== rec) return;
      state.rec = null;
      var name = error && error.name;
      setText('make-problem', name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError'
        ? 'Microphone permission was refused. Allow it in the browser address bar to record your voice, or use the computer voice.'
        : name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError'
          ? 'No microphone was found on this device.'
          : name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError'
            ? 'The microphone is busy in another app or tab.'
            : 'This browser could not open the microphone.');
      draw();
    });
  }

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
    var statsEl = $('passage-stats');
    if (statsEl) {
      var words = state.sentences.reduce(function (acc, row) { return acc + String(row.text || '').split(/\s+/).filter(Boolean).length; }, 0);
      if (words > 0) {
        var mins = Math.max(1, Math.round(words / 130));
        statsEl.textContent = count(words, 'word') + ' · about ' + count(mins, 'minute') + ' to read';
        statsEl.hidden = false;
      } else {
        statsEl.textContent = '';
        statsEl.hidden = true;
      }
    }
  }

  function stateLine(row) {
    var key = keyOf(row);
    if (state.rec && state.rec.key === key) {
      if (state.rec.stage === 'asking') return 'Waiting for microphone...';
      if (state.rec.stage === 'recording') return 'Recording now...';
      return 'Saving recording...';
    }
    var clip = clipOf(row);
    if (!clip) return 'No recording yet.';
    var who = clip.source === 'teacher' ? ' (your voice)' : '';
    return 'Recorded' + who + (clip.ms ? ', ' + (clip.ms / 1000).toFixed(1) + ' seconds.' : '.');
  }

  function draw() {
    var list = $('line-rows');
    list.textContent = '';
    var busyMic = !!state.rec;
    var mode = pageMode();
    var groups = pageGroups();
    var totalPages = groups.length;
    var pageStartMap = {};
    var cursor = 0;
    groups.forEach(function (g, gi) {
      pageStartMap[cursor] = gi + 1;
      cursor += g.length;
    });
    if (state.sentences.length && mode === 'scroll') {
      var scrollHead = el('li', 'ra-page-sep');
      scrollHead.setAttribute('data-page-header', '1');
      scrollHead.appendChild(el('span', '', 'All on one page (scroll down)'));
      var toPages = el('button', 'btn btn-small ra-split-btn', 'Use separate pages');
      toPages.type = 'button';
      toPages.setAttribute('data-use-pages', 'auto');
      toPages.disabled = state.making || busyMic;
      toPages.addEventListener('click', function () {
        if ($('f-page-mode')) $('f-page-mode').value = 'auto';
        state.unsaved = true;
        readPassage();
        draw();
        refreshFile();
      });
      scrollHead.appendChild(toPages);
      list.appendChild(scrollHead);
    }
    state.sentences.forEach(function (row, index) {
      var pageNum = pageStartMap[index] || 0;
      if (mode !== 'scroll' && pageNum > 0) {
        var sep = el('li', 'ra-page-sep');
        sep.setAttribute('data-page-header', String(pageNum));
        sep.appendChild(el('span', '', totalPages === 1 ? 'Page 1 of 1' : 'Page ' + pageNum + ' of ' + totalPages));
        if (pageNum > 1) {
          var joinBtn = el('button', 'btn btn-small ra-split-btn', 'Join with page ' + (pageNum - 1));
          joinBtn.type = 'button';
          joinBtn.setAttribute('data-join-page', String(index));
          joinBtn.disabled = state.making || busyMic;
          joinBtn.addEventListener('click', function () { togglePageBreak(index, false); });
          sep.appendChild(joinBtn);
        }
        list.appendChild(sep);
      } else if (mode !== 'scroll' && index > 0) {
        var splitLi = el('li', 'ra-split-sep');
        var splitBtn = el('button', 'btn btn-small ra-split-btn', 'Split page here');
        splitBtn.type = 'button';
        splitBtn.setAttribute('data-split-page', String(index));
        splitBtn.setAttribute('aria-label', 'Start a new page before sentence ' + (index + 1));
        splitBtn.disabled = state.making || busyMic;
        splitBtn.addEventListener('click', function () { togglePageBreak(index, true); });
        splitLi.appendChild(splitBtn);
        list.appendChild(splitLi);
      }
      var clip = clipOf(row), n = index + 1, key = keyOf(row);
      var isThisRec = !!(state.rec && state.rec.key === key);
      var item = el('li', 'voice-row' + (clip ? ' is-made' : '') + (row.para ? ' ra-para' : ''));
      item.setAttribute('data-line', String(n));
      item.appendChild(el('span', 'ra-text', row.text));
      item.appendChild(el('span', 'voice-state', stateLine(row)));
      if (clip && !isThisRec) {
        var play = el('button', 'btn btn-small', 'Play');
        play.type = 'button';
        play.setAttribute('aria-label', 'Play sentence ' + n);
        play.setAttribute('data-play', String(n));
        play.disabled = busyMic;
        play.addEventListener('click', function () { playClip(row); });
        item.appendChild(play);
      }
      var recBtn = el('button', 'btn btn-small', isThisRec && state.rec.stage === 'recording' ? 'Stop' : 'Record');
      recBtn.type = 'button';
      recBtn.setAttribute('aria-label', isThisRec && state.rec.stage === 'recording' ? 'Stop recording sentence ' + n : 'Record sentence ' + n + ' with microphone');
      recBtn.setAttribute('data-record', String(n));
      recBtn.disabled = state.making || (busyMic && !(isThisRec && state.rec.stage === 'recording'));
      recBtn.addEventListener('click', function () { record(row, n); });
      item.appendChild(recBtn);
      var make = el('button', 'btn btn-small', clip ? 'Make again' : 'Make recording');
      make.type = 'button';
      make.setAttribute('aria-label', (clip ? 'Make the recording of sentence ' + n + ' again' : 'Make a recording of sentence ' + n));
      make.setAttribute('data-make', String(n));
      make.disabled = !state.ready || state.making || busyMic;
      make.addEventListener('click', function () { makeSome([row], n); });
      item.appendChild(make);
      if (clip && !isThisRec) {
        var rm = el('button', 'btn btn-small', 'Remove');
        rm.type = 'button';
        rm.setAttribute('aria-label', 'Remove recording for sentence ' + n);
        rm.setAttribute('data-remove', String(n));
        rm.disabled = state.making || busyMic;
        rm.addEventListener('click', function () {
          delete state.clips[key];
          state.unsaved = true;
          draw();
          refreshFile();
        });
        item.appendChild(rm);
      }
      list.appendChild(item);
    });
    var need = needing().length;
    $('make-all').disabled = !state.ready || state.making || busyMic || !need;
    $('make-all').textContent = need && need < state.sentences.length ? 'Make the recordings for the ' + count(need, 'sentence') + ' that ' + (need === 1 ? 'has' : 'have') + ' none'
      : need ? 'Make the recordings for ' + (need === 1 ? 'the sentence' : 'all ' + need + ' sentences') : 'Make the recordings';
    show('stop', state.making);
    $('get-voice').disabled = state.getting || state.ready;
    if (state.ready) $('get-voice').textContent = 'The voice is ready';
    if (!state.making && !busyMic) {
      if (!state.sentences.length) setText('make-said', state.ready ? 'Type a passage in step 1.' : 'Type a passage in step 1 first.');
      else if (!state.ready) setText('make-said', 'Record any sentence with your microphone below, get the computer voice in step 2, or save as a reading file without recordings in step 4.');
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
  // Step 3: one recording for each sentence (computer voice)
  // ---------------------------------------------------------------------------
  function makeOne(row, signal) {
    var voice = $('f-voice').value || 'af_heart';
    if (signal && signal.aborted) return Promise.reject(abortError());
    return engine.speak(row.text, voice, { signal: signal }).then(function (wav) {
      if (signal && signal.aborted) throw abortError();
      var mp3 = state.mp3 ? engine.wavToMp3(wav, MP3_KBPS) : null;
      if (signal && signal.aborted) throw abortError();
      var uri = mp3 ? engine.toDataUri(mp3, 'audio/mpeg') : engine.toDataUri(wav, 'audio/wav');
      if (uri.length > builder.MAX_CLIP_CHARS) throw new Error('too long');
      state.clips[keyOf(row)] = { uri: uri, ms: engine.wavMs(wav), voice: voice, source: 'computer', timings: wavTimings(row.text, wav) };
      state.unsaved = true;
    });
  }
  // rows: the sentences to record. one: the number of the sentence whose own button was pressed, when it was one.
  function makeSome(rows, one) {
    if (state.making || state.rec || !state.ready || !rows.length) return;
    var run = ++state.makeRun;
    var stop = makeController();
    state.making = true;
    state.stop = stop;
    clearBuilt();
    setText('make-problem', '');
    setText('file-said', 'Making the recordings.');
    draw();
    var done = 0, failed = [], stopped = false, numbers = rows.map(function (row) { return state.sentences.indexOf(row) + 1; });
    var step = function (index) {
      if (run !== state.makeRun || stop.signal.aborted) { stopped = true; return Promise.resolve(); }
      if (index >= rows.length) return Promise.resolve();
      setText('make-said', 'Making ' + (index + 1) + ' of ' + rows.length + '.');
      return makeOne(rows[index], stop.signal).then(function () { done += 1; }, function (error) {
        if (run !== state.makeRun || stop.signal.aborted || (error && error.name === 'AbortError')) { stopped = true; return; }
        failed.push(numbers[index]);
      }).then(function () { return (stopped || run !== state.makeRun) ? null : step(index + 1); });
    };
    step(0).then(function () {
      if (run !== state.makeRun) return;
      state.making = false;
      if (state.stop === stop) state.stop = null;
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
  // Unified code-name / batch .zip (Step 4)
  // ---------------------------------------------------------------------------
  function cleanRosterLine(raw) {
    var s = String(raw || '').replace(/^\uFEFF/, '').trim();
    if (!s) return '';
    s = s.replace(/^(?:\(\d{1,3}\)|\d{1,3}[.)]|[\u2022\u25CF\u25CB\u25AA\u2023\u2043*\u2013\u2014-])\s+/, '').trim();
    var col = s.indexOf('\t') >= 0 ? s.split('\t')[0] : (s.indexOf(',') >= 0 ? s.split(',')[0] : s);
    return col.trim().replace(/^["']+|["']+$/g, '').trim();
  }
  function batchList() {
    var seen = Object.create(null), out = { names: [], twice: [], unusable: [], over: 0 };
    String(($('f-batch-names') && $('f-batch-names').value) || '').replace(/^\uFEFF/, '').split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var cleaned = cleanRosterLine(line);
      var name = builder.codeName(cleaned);
      if (!name) { out.unusable.push((cleaned || line.trim()).slice(0, 40)); return; }
      var key = name.toLowerCase();
      if (seen[key]) { if (out.twice.indexOf(name) < 0) out.twice.push(name); return; }
      seen[key] = true;
      if (out.names.length >= MAX_STUDENTS) { out.over++; return; }
      out.names.push(name);
    });
    return out;
  }
  function activeSingleCode() {
    var list = batchList();
    return list.names.length === 1 ? list.names[0] : '';
  }
  function updateSingleUrl() {
    if (!state.baseHtml || !state.made) return;
    var single = activeSingleCode();
    var html = single ? builder.withCodeName(state.baseHtml, single) : state.baseHtml;
    var blob = new Blob([html], { type: 'text/html' });
    if (state.fileUrl) { try { URL.revokeObjectURL(state.fileUrl); } catch (_) {} state.fileUrl = ''; }
    state.built = { html: html, name: fileNameFor(single), bytes: blob.size, codeName: single };
    try { state.fileUrl = URL.createObjectURL(blob); } catch (_) { state.fileUrl = ''; }
    var made = state.made;
    setText('file-said', 'The file is ready: ' + count(made.sentences, 'sentence') + ' on ' + count(made.pages, 'page') + ', ' + fileSize(blob.size) + '.');
    var recNote = !made.recorded
      ? 'No recordings yet (reading file with Reading tools only). Record sentences in step 3 if you want the file to read aloud. '
      : (made.missing ? count(made.missing, 'sentence') + ' ' + (made.missing === 1 ? 'has' : 'have') + ' no recording. The student sees ' + (made.missing === 1 ? 'it' : 'them') + ', and the file does not read ' + (made.missing === 1 ? 'it' : 'them') + ' aloud. ' : '');
    var sylNote = made.syllables ? 'It has a Syllables button, which shows longer words in parts (' + made.syllables.example + '). ' : '';
    var posNote = made.partsOfSpeech ? 'It has a Parts of speech button. ' : '';
    var dictNote = made.dictionary ? 'It has a Word meanings button (' + count(made.dictionary.words, 'word') + '). ' : '';
    var micNote = made.studentMic ? 'Students can record and listen back to their own voice on their device only. ' : '';
    setText('file-sub', recNote + sylNote + posNote + dictNote + micNote + 'It will be saved as ' + state.built.name + '.');
    if (state.fileUrl) { $('try').setAttribute('href', TRY_PAGE + '#' + state.fileUrl); show('try', true); }
    show('save', true);
  }
  function drawBatch() {
    var list = batchList(), n = list.names.length, parts = [];
    var btn = $('batch-make');
    if (n === 0) {
      parts.push('Leave empty so each student types a code name at the start.');
      if (btn) btn.hidden = true;
    } else if (n === 1) {
      parts.push('Using ' + list.names[0] + ' in the file above' + (state.built ? ' (' + state.built.name + ')' : '') + '. Add another line to save a .zip.');
      if (btn) btn.hidden = true;
    } else {
      parts.push(count(n, 'file') + (state.built ? ', about ' + fileSize(n * state.built.bytes) + ' in all.' : '.'));
      if (btn) {
        btn.hidden = false;
        btn.textContent = 'Save .zip for ' + n + ' students';
      }
    }
    if (list.over) parts.push('Not used: ' + count(list.over, 'more code name') + '. At most ' + MAX_STUDENTS + ' go in one .zip file.');
    if (list.twice.length) parts.push('Listed more than once, used once: ' + list.twice.join(', ') + '.');
    if (list.unusable.length) parts.push('Not used, because a code name needs a letter or a number: ' + list.unusable.join(', ') + '.');
    setText('batch-said', parts.join(' '));
  }
  function saveBatchZip() {
    setText('batch-problem', '');
    var list = batchList();
    if (list.names.length < 2) { setText('batch-problem', 'Type at least 2 code names to save a .zip file.'); return; }
    if (!state.baseHtml) { setText('batch-problem', 'The file above is not ready yet.'); return; }
    if (!win.AlloPacketZip || typeof win.AlloPacketZip.create !== 'function') { setText('batch-problem', 'This page could not load the part that makes .zip files. Load the page again.'); return; }
    try {
      var zip = win.AlloPacketZip.create(), encoder = new TextEncoder();
      list.names.forEach(function (name) {
        zip.add(fileNameFor(name), encoder.encode(builder.withCodeName(state.baseHtml, name)));
      });
      var parts = zip.finish();
      var zipName = titleStem() + '__' + list.names.length + '-students.zip';
      var url = URL.createObjectURL(new Blob(parts, { type: 'application/zip' }));
      download(url, zipName);
      win.setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);
      state.unsaved = false;
      setText('batch-said', 'Saved ' + zipName + ' (' + fileSize(zip.bytes) + '). Send each student their own file.');
    } catch (error) {
      setText('batch-problem', 'The .zip file could not be made (' + said(error) + ').');
    }
  }
  function loadRosterFile(file) {
    setText('batch-problem', '');
    if (!file) return;
    if (file.size > MAX_ROSTER_BYTES) { setText('batch-problem', 'That text file is too large. Choose a plain .txt list of code names.'); return; }
    if (typeof win.FileReader !== 'function') { setText('batch-problem', 'This browser cannot read local files here.'); return; }
    var reader = new win.FileReader();
    reader.onload = function () {
      var input = $('f-batch-names');
      if (input) input.value = String(reader.result || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
      if (state.baseHtml) updateSingleUrl();
      drawBatch();
    };
    reader.onerror = function () { setText('batch-problem', 'This browser could not read that file.'); };
    reader.readAsText(file);
  }

  // ---------------------------------------------------------------------------
  // Print on paper (honoring Syllables!)
  // ---------------------------------------------------------------------------
  function clearPaper() {
    doc.body.classList.remove('paper-on');
    var paper = $('paper');
    if (paper) paper.textContent = '';
    show('print', false);
    show('print-syl-wrap', false);
    show('print-bold-wrap', false);
    show('print-dict-wrap', false);
  }
  function loadPassageFile(file) {
    setText('passage-problem', '');
    if (!file) return;
    if (file.size > MAX_ROSTER_BYTES) { setText('passage-problem', 'That text file is too large. Choose a plain .txt or .md file.'); return; }
    if (typeof win.FileReader !== 'function') { setText('passage-problem', 'This browser cannot read local files here.'); return; }
    var reader = new win.FileReader();
    reader.onload = function () {
      var raw = String(reader.result || '').replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\r\n?/g, '\n');
      $('f-text').value = raw.slice(0, builder.MAX_CHARS);
      if (!$('f-title').value.trim() && file.name) {
        $('f-title').value = file.name.replace(/\.(?:txt|md|markdown)$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 80);
      }
      cancelMic();
      cancelMake();
      state.unsaved = true;
      readPassage();
      draw();
      if (useDictPics() && win.AlloPacketMyWords) syncMyPictures().then(function () { refreshFile(); });
      refreshFile();
    };
    reader.onerror = function () { setText('passage-problem', 'This browser could not read that file.'); };
    reader.readAsText(file);
  }
  function drawPaper() {
    var paper = $('paper');
    if (!paper || !state.sentences.length) { clearPaper(); return; }
    paper.textContent = '';
    var withSyl = !!($('print-syl') && $('print-syl').checked && (isSpanish() || table));
    var withBold = !!($('print-bold') && $('print-bold').checked);
    var appendPaperText = function (target, textStr) {
      if (!withBold) { target.appendChild(doc.createTextNode(textStr)); return; }
      var re = /[A-Za-z\u00C0-\u024F\u00b7]+/g, m, last = 0;
      while ((m = re.exec(textStr))) {
        if (m.index > last) target.appendChild(doc.createTextNode(textStr.slice(last, m.index)));
        var tok = m[0];
        var plainLen = tok.replace(/\u00b7/g, '').length;
        if (plainLen < 2) {
          target.appendChild(doc.createTextNode(tok));
        } else {
          var targetLetters = plainLen <= 3 ? Math.max(1, plainLen - 1) : Math.ceil(plainLen * 0.45);
          var seen = 0, cutIdx = 0;
          for (var ci = 0; ci < tok.length; ci++) {
            if (tok[ci] !== '\u00b7') seen++;
            cutIdx = ci + 1;
            if (seen >= targetLetters) break;
          }
          var b = doc.createElement('strong');
          b.textContent = tok.slice(0, cutIdx);
          target.appendChild(b);
          if (cutIdx < tok.length) target.appendChild(doc.createTextNode(tok.slice(cutIdx)));
        }
        last = m.index + tok.length;
      }
      if (last < textStr.length) target.appendChild(doc.createTextNode(textStr.slice(last)));
    };
    var sheet = el('div', 'paper-sheet');
    var head = el('div', 'paper-head');
    var titleText = String(($('f-title') && $('f-title').value) || '').replace(/\s+/g, ' ').trim() || 'Read along';
    head.appendChild(el('h1', '', titleText));
    var meta = el('div', 'paper-meta');
    meta.appendChild(el('span', '', 'Name: ____________________'));
    meta.appendChild(el('span', '', 'Date: ____________'));
    head.appendChild(meta);
    sheet.appendChild(head);
    if (withSyl && withBold) sheet.appendChild(el('p', 'paper-sub', 'Longer words are shown with syllable dots and bold word starts.'));
    else if (withSyl) sheet.appendChild(el('p', 'paper-sub', 'Longer words are shown with syllable dots.'));
    else if (withBold) sheet.appendChild(el('p', 'paper-sub', 'Word starts are bolded to guide reading.'));
    var body = el('div', 'paper-body');
    if (typeof builder.isRtlLang === 'function' && builder.isRtlLang(passageLang())) body.setAttribute('dir', 'rtl');
    var currentP = null;
    state.sentences.forEach(function (row, idx) {
      var textOut = row.text;
      if (withSyl && (isEnglish() || isSpanish())) {
        var syl = isSpanish() && typeof builder.syllabifySpanish === 'function'
          ? builder.syllableText(row.text, builder.syllabifySpanish, { spanish: true })
          : builder.syllableText(row.text, syllablesOf);
        if (syl) textOut = syl;
      }
      if (row.heading === 1 || row.heading === 2 || row.heading === 3) {
        currentP = null;
        var hNode = el('h2', 'paper-h');
        appendPaperText(hNode, textOut);
        body.appendChild(hNode);
        return;
      }
      if (!currentP || (row.para && idx > 0)) {
        currentP = el('p', 'paper-para');
        body.appendChild(currentP);
      }
      if (currentP.childNodes.length) currentP.appendChild(doc.createTextNode(' '));
      appendPaperText(currentP, textOut);
    });
    sheet.appendChild(body);
    var withDict = !!($('print-dict') && $('print-dict').checked && state.made && state.made.dictionary);
    if (withDict && state.made.lesson && state.made.lesson.blocks && state.made.lesson.blocks[0]) {
      var merged = Object.create(null);
      (state.made.lesson.blocks[0].items || []).forEach(function (it) {
        if (!it || !it.glossary) return;
        Object.keys(it.glossary).forEach(function (k) { if (!merged[k]) merged[k] = it.glossary[k]; });
      });
      var gKeys = Object.keys(merged).sort();
      if (gKeys.length) {
        var gBox = el('div', 'paper-gloss');
        gBox.appendChild(el('h2', '', 'Word meanings'));
        var ul = el('ul', 'paper-gloss-list');
        var imagesMap = (state.made.lesson && state.made.lesson.images) || {};
        gKeys.forEach(function (k) {
          var e = merged[k];
          var li = el('li', 'paper-gloss-item');
          if (e.img && imagesMap[e.img]) {
            var img = doc.createElement('img');
            img.className = 'paper-gloss-img';
            img.src = imagesMap[e.img];
            img.alt = e.alt || e.w || k;
            li.appendChild(img);
          }
          var spanText = el('span', '');
          var head = e.w && e.w !== k ? k + ' (' + e.w + ')' : (e.w || k);
          spanText.appendChild(el('span', 'paper-gloss-word', head + (e.p ? ' (' + e.p + ')' : '') + ': '));
          spanText.appendChild(doc.createTextNode(e.d));
          li.appendChild(spanText);
          ul.appendChild(li);
        });
        gBox.appendChild(ul);
        sheet.appendChild(gBox);
      }
    }
    paper.appendChild(sheet);
    doc.body.classList.add('paper-on');
    show('print', true);
    show('print-syl-wrap', !!(state.made && state.made.syllables));
    show('print-bold-wrap', true);
    show('print-dict-wrap', !!(state.made && state.made.dictionary));
  }
  function drawPreview() {
    var box = $('live-preview'), card = $('preview-card');
    if (!box || !card) return;
    if (!state.made || !state.made.lesson || !state.made.lesson.blocks || !state.made.lesson.blocks[0]) {
      box.hidden = true;
      card.textContent = '';
      return;
    }
    var item = state.made.lesson.blocks[0].items && state.made.lesson.blocks[0].items[0];
    if (!item || !Array.isArray(item.lines) || !item.lines.length) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    var hasSyl = item.lines.some(function (l) { return !!l.syl; });
    show('preview-syl-wrap', hasSyl);
    var showSyl = hasSyl && !!($('preview-syl') && $('preview-syl').checked);
    var modeLabel = pageMode() === 'scroll' ? 'All on one page (scroll down)' : ('Page 1 of ' + state.made.pages);
    var barLabel = useSimpleBar() ? ' · Simple toolbar' : '';
    setText('preview-meta', modeLabel + barLabel);
    card.textContent = '';
    card.setAttribute('dir', (typeof builder.isRtlLang === 'function' && builder.isRtlLang(passageLang())) ? 'rtl' : 'ltr');
    var gloss = item.glossary || null;
    var imagesMap = state.made.lesson.images || {};
    var currentP = null;
    item.lines.slice(0, 12).forEach(function (row, idx) {
      var shown = (showSyl && row.syl) ? row.syl : row.text;
      var posMap = {};
      if (row.pos) row.pos.split(',').forEach(function (pair) { var p = pair.split(':'); if (p.length === 2) posMap[p[0]] = p[1]; });
      var target;
      if (row.heading === 1 || row.heading === 2 || row.heading === 3) {
        currentP = null;
        target = el('h3', 'ra-preview-h');
        card.appendChild(target);
      } else {
        if (!currentP || (row.para && idx > 0)) {
          currentP = el('p', 'ra-preview-p');
          card.appendChild(currentP);
        } else if (currentP.childNodes.length) {
          currentP.appendChild(doc.createTextNode(' '));
        }
        target = currentP;
      }
      if (!row.pos && !gloss) {
        target.appendChild(doc.createTextNode(shown));
        return;
      }
      var re = /[A-Za-z\u00b7]+(?:['\u2019][A-Za-z\u00b7]+)*/g, m, last = 0, wi = 0;
      while ((m = re.exec(shown))) {
        if (m.index > last) target.appendChild(doc.createTextNode(shown.slice(last, m.index)));
        var tag = posMap[String(wi)] || '';
        var plain = m[0].replace(/\u00b7/g, '').toLowerCase();
        var hasG = !!(gloss && Object.prototype.hasOwnProperty.call(gloss, plain));
        if (tag || hasG) {
          var cls = [];
          if (tag) cls.push('ra-preview-pos-' + tag);
          if (hasG) cls.push('ra-preview-def');
          target.appendChild(el('span', cls.join(' '), m[0]));
        } else {
          target.appendChild(doc.createTextNode(m[0]));
        }
        last = m.index + m[0].length;
        wi++;
      }
      if (last < shown.length) target.appendChild(doc.createTextNode(shown.slice(last)));
    });
    var picEntries = gloss ? Object.keys(gloss).filter(function (k) { return gloss[k].img && imagesMap[gloss[k].img]; }).slice(0, 12) : [];
    var hiddenCount = Object.keys(state.hiddenPics || {}).length;
    if (picEntries.length || hiddenCount) {
      var picRow = el('div', 'ra-preview-pics');
      picEntries.forEach(function (k) {
        var e = gloss[k];
        var chip = el('span', 'ra-preview-pic-chip');
        var img = doc.createElement('img');
        img.className = 'ra-preview-pic-img';
        img.src = imagesMap[e.img];
        img.alt = e.alt || e.w || k;
        chip.appendChild(img);
        chip.appendChild(el('span', 'ra-preview-pic-word', e.w || k));
        var repBtn = el('button', 'ra-pic-act', 'Replace');
        repBtn.type = 'button';
        repBtn.setAttribute('data-pic-replace', k);
        repBtn.setAttribute('aria-label', 'Replace picture for ' + (e.w || k));
        var hideBtn = el('button', 'ra-pic-act', 'Hide');
        hideBtn.type = 'button';
        hideBtn.setAttribute('data-pic-hide', k);
        hideBtn.setAttribute('aria-label', 'Hide picture for ' + (e.w || k));
        chip.appendChild(repBtn);
        chip.appendChild(hideBtn);
        picRow.appendChild(chip);
      });
      if (hiddenCount) {
        var restoreBtn = el('button', 'ra-pic-act ra-pic-restore', 'Show ' + count(hiddenCount, 'hidden picture'));
        restoreBtn.type = 'button';
        restoreBtn.setAttribute('data-pic-restore-all', '1');
        picRow.appendChild(restoreBtn);
      }
      card.appendChild(picRow);
    }
  }

  // ---------------------------------------------------------------------------
  // Step 4: the file
  // ---------------------------------------------------------------------------
  function download(url, name) {
    var link = doc.createElement('a');
    link.href = url;
    link.download = name;
    link.hidden = true;
    doc.body.appendChild(link);
    link.click();
    doc.body.removeChild(link);
  }
  function clearBuilt() {
    win.clearTimeout(buildTimer);
    state.built = null;
    state.baseHtml = '';
    state.made = null;
    if (state.fileUrl) { try { URL.revokeObjectURL(state.fileUrl); } catch (_) {} state.fileUrl = ''; }
    show('try', false);
    show('save', false);
    show('after-save', false);
    show('live-preview', false);
    clearPaper();
    setText('file-sub', '');
    setText('file-problem', '');
  }
  function refreshFile() {
    clearBuilt();
    if (state.making || state.rec) return;
    if (!state.sentences.length) {
      setText('file-said', 'Type a passage in step 1 to build the file.');
      drawBatch();
      return;
    }
    var clips = Object.create(null), clipSources = Object.create(null), timings = Object.create(null), voices = [];
    state.sentences.forEach(function (row) {
      var clip = clipOf(row);
      if (!clip) return;
      var k = keyOf(row);
      clips[k] = clip.uri;
      clipSources[k] = clip.source === 'teacher' ? 'teacher' : 'computer';
      if (Array.isArray(clip.timings) && clip.timings.length) timings[k] = clip.timings;
      if (clip.voice && voices.indexOf(clip.voice) < 0) voices.push(clip.voice);
    });
    var bankReady = !!(win.AlloVocabBank && typeof win.AlloVocabBank.ready === 'function' && win.AlloVocabBank.ready());
    var dictReady = useDict() && bankReady;
    var picsReady = useDictPics() && !!(symbolBank || getPictureMatcher() || Object.keys(myPics).length);
    var made, result;
    try {
      made = builder.lessonFromReadAlong({ loader: loader, title: $('f-title').value, sentences: state.sentences, clips: clips, clipSources: clipSources, timings: timings, voice: voices.join(', '), lang: passageLang(), syllables: table ? syllablesOf : null, syllableSource: tableSource(), pageMode: pageMode(), partsOfSpeech: usePos(), posLookup: (usePos() && bankReady) ? posLookup : null, dictionary: dictReady ? dictLookup : null, pictures: picsReady ? picLookup : null, studentMic: useStudentMic(), deviceVoice: useDeviceVoice(), simpleBar: useSimpleBar() });
      result = builder.buildReadAlongPacket({ made: made, loader: loader });
    } catch (error) {
      setText('file-said', 'The file is not ready yet.');
      setText('file-problem', said(error) || 'The file could not be put together.');
      return;
    }
    state.baseHtml = result.html;
    state.made = made;
    if (useDictPics() && !picsLoading) {
      setText('pics-said', made.pictures && made.pictures.count
        ? count(made.pictures.count, 'word picture') + ' matched for this passage.'
        : 'No matching pictures found for this passage yet. Add custom pictures on Find a picture.');
    }
    updateSingleUrl();
    drawPaper();
    drawPreview();
    drawBatch();
  }
  function refreshSoon() { clearBuilt(); buildTimer = win.setTimeout(refreshFile, 300); }
  function saveFile() {
    if (!state.built) return;
    var url = state.fileUrl;
    if (!url) { try { url = URL.createObjectURL(new Blob([state.built.html], { type: 'text/html' })); } catch (_) { url = ''; } }
    if (!url) { setText('file-problem', 'This browser cannot save files from a page. Open this page in Chrome, Edge, Firefox or Safari.'); return; }
    download(url, state.built.name);
    state.unsaved = false;
    show('after-save', true);
    $('after-save').focus();
  }

  // ---------------------------------------------------------------------------
  // Reopen a read-along file (reuses unchanged sentence MP3/WAV clips!)
  // ---------------------------------------------------------------------------
  var reopenPending = null;
  function reopenNote(msg, page) {
    setText('reopen-line', msg);
    var link = $('reopen-page');
    if (link) {
      if (page && page.href) { link.setAttribute('href', page.href); link.textContent = 'Open ' + page.name; }
      link.hidden = !(page && page.href);
    }
    show('reopen-note', true);
    var box = $('reopen-note');
    if (box && typeof box.focus === 'function') box.focus();
  }
  function reopen(textOfFile, sourceName, rawBytes) {
    reopenPending = null;
    var verify = win.AlloPacketVerify;
    var reopenKit = win.AlloPacketReopen;
    var handoff = win.AlloPacketHandoff;
    if (!verify || typeof verify.readParts !== 'function' || typeof builder.readBack !== 'function') {
      reopenNote('This page could not read the file. Load the page again.');
      return false;
    }
    var bytes = rawBytes || (typeof win.TextEncoder === 'function' ? new win.TextEncoder().encode(String(textOfFile || '')).buffer : null);
    var fileName = String(sourceName || 'the file').slice(0, 120);
    var back = null;
    if (reopenKit && typeof reopenKit.readReadAlong === 'function') {
      var checked = reopenKit.readReadAlong(bytes || textOfFile, { verify: verify, builder: builder, codeName: builder.codeName });
      if (!checked.ok) {
        var pageHref = checked.page ? checked.page.href : '';
        if (pageHref && bytes) {
          reopenPending = {
            file: { name: fileName, bytes: bytes },
            href: pageHref,
            hash: pageHref === 'packets-results.html' ? ((handoff && handoff.RESULTS_HASH) || '#import-results') : ((handoff && handoff.HASH) || '#open-file'),
          };
        }
        reopenNote(checked.why || 'This is not a read-along file made on this page.', checked.page);
        return false;
      }
      back = checked.readAlong;
    } else {
      var parts = verify.readParts(textOfFile);
      if (!parts || !parts.ok) {
        reopenNote(parts && parts.kind === 'results'
          ? 'This is a results file, not a read-along file. Add up results reads it.'
          : 'This is not a read-along file made on this page.');
        return false;
      }
      back = builder.readBack(parts);
      if (!back || !back.ok) {
        reopenNote('This file was not made on Make a read-along. Open it on the page that made it.');
        return false;
      }
    }
    cancelMic();
    cancelMake();
    $('f-title').value = back.title || '';
    $('f-text').value = back.text || '';
    if ($('f-page-mode')) $('f-page-mode').value = back.pageMode || 'auto';
    if ($('f-lang')) $('f-lang').value = back.lang || 'en';
    if ($('f-pos')) $('f-pos').checked = !!back.partsOfSpeech;
    if ($('f-dict')) $('f-dict').checked = !!back.dictionary;
    if ($('f-dict-pics')) $('f-dict-pics').checked = !!back.pictures;
    if ($('f-simple-bar')) $('f-simple-bar').checked = !!back.simpleBar;
    if ($('f-student-mic')) $('f-student-mic').checked = !!back.studentMic;
    if ($('f-device-voice')) $('f-device-voice').checked = !!back.deviceVoice;
    syncLangUi();
    if (back.voice && $('f-voice')) {
      var opts = $('f-voice').options || [];
      for (var i = 0; i < opts.length; i++) {
        if (opts[i].value === back.voice) { $('f-voice').value = back.voice; break; }
      }
    }
    state.clips = Object.create(null);
    state.hiddenPics = Object.create(null);
    Object.keys(back.clips || {}).forEach(function (k) {
      state.clips[k] = { uri: back.clips[k], ms: 0, voice: back.voice || '', source: (back.clipSources && back.clipSources[k]) || 'computer' };
    });
    if ($('f-batch-names')) {
      $('f-batch-names').value = back.learner || '';
      if (back.learner && $('batch')) $('batch').open = true;
    }
    state.unsaved = false;
    syncLangUi();
    readPassage();
    draw();
    if ((useDict() || usePos()) && !(win.AlloVocabBank && typeof win.AlloVocabBank.ready === 'function' && win.AlloVocabBank.ready())) {
      ensureDictionary().then(function () { refreshFile(); });
    }
    if (useDictPics()) {
      ensurePictures().then(function () { refreshFile(); });
    }
    refreshFile();
    reopenNote('Opened ' + (back.title || sourceName || 'the file') + '. ' + count(back.sentences.length, 'sentence') + ', '
      + count(back.recordings, 'existing recording') + ' kept. Unchanged sentences keep their recordings.');
    return true;
  }

  function start() {
    if (!engine || !builder || !loader || !loader.CHECK_ADAPTERS || !loader.CHECK_ADAPTERS[builder.ACTIVITY]) { show('no-parts', true); return; }
    var timer = 0;
    $('f-text').addEventListener('input', function () {
      cancelMic();
      if (state.making) { cancelMake(); setText('make-said', 'Stopped because the passage changed.'); }
      win.clearTimeout(timer);
      timer = win.setTimeout(function () {
        readPassage();
        draw();
        if (useDictPics() && win.AlloPacketMyWords) syncMyPictures().then(function () { refreshFile(); });
        else refreshSoon();
      }, 250);
    });
    $('f-title').addEventListener('input', refreshSoon);
    if ($('f-page-mode')) $('f-page-mode').addEventListener('change', function () { state.unsaved = true; readPassage(); draw(); refreshFile(); });
    if ($('f-lang')) $('f-lang').addEventListener('change', function () { state.unsaved = true; syncLangUi(); refreshFile(); });
    if ($('f-pos')) $('f-pos').addEventListener('change', function () {
      state.unsaved = true;
      if (usePos()) { ensureDictionary().then(function () { refreshFile(); }); }
      refreshFile();
    });
    if ($('f-dict')) $('f-dict').addEventListener('change', function () {
      state.unsaved = true;
      if (useDict()) { ensureDictionary().then(function () { refreshFile(); }); }
      else { setText('dict-said', ''); refreshFile(); }
    });
    if ($('f-dict-pics')) $('f-dict-pics').addEventListener('change', function () {
      state.unsaved = true;
      if (useDictPics()) { ensurePictures().then(function () { refreshFile(); }); }
      else { setText('pics-said', ''); refreshFile(); }
    });
    if ($('f-simple-bar')) $('f-simple-bar').addEventListener('change', function () { state.unsaved = true; refreshFile(); });
    if ($('preview-syl')) $('preview-syl').addEventListener('change', drawPreview);
    if ($('preview-card')) $('preview-card').addEventListener('click', function (ev) {
      var target = ev && ev.target && ev.target.closest ? ev.target.closest('button') : null;
      if (!target) return;
      var hideK = target.getAttribute('data-pic-hide');
      if (hideK) {
        state.hiddenPics[hideK] = true;
        state.unsaved = true;
        refreshFile();
        return;
      }
      var repK = target.getAttribute('data-pic-replace');
      if (repK) {
        triggerReplacePicture(repK);
        return;
      }
      if (target.getAttribute('data-pic-restore-all')) {
        state.hiddenPics = {};
        state.unsaved = true;
        refreshFile();
      }
    });
    if ($('f-student-mic')) $('f-student-mic').addEventListener('change', function () { state.unsaved = true; refreshFile(); });
    if ($('f-device-voice')) $('f-device-voice').addEventListener('change', function () { state.unsaved = true; refreshFile(); });
    $('get-voice').addEventListener('click', getVoice);
    $('make-all').addEventListener('click', function () { makeSome(needing(), 0); });
    $('stop').addEventListener('click', function () { if (state.stop) state.stop.abort(); });
    $('save').addEventListener('click', saveFile);
    if ($('print')) $('print').addEventListener('click', function () { drawPaper(); if (typeof win.print === 'function') win.print(); });
    if ($('print-syl')) $('print-syl').addEventListener('change', drawPaper);
    if ($('print-bold')) $('print-bold').addEventListener('change', drawPaper);
    if ($('print-dict')) $('print-dict').addEventListener('change', drawPaper);
    if ($('passage-load') && $('passage-file')) {
      $('passage-load').addEventListener('click', function () { $('passage-file').value = ''; $('passage-file').click(); });
      $('passage-file').addEventListener('change', function () {
        var file = this.files && this.files[0];
        this.value = '';
        loadPassageFile(file);
      });
    }
    if ($('f-batch-names')) $('f-batch-names').addEventListener('input', function () {
      setText('batch-problem', '');
      if (state.baseHtml) updateSingleUrl();
      drawBatch();
    });
    if ($('batch-make')) $('batch-make').addEventListener('click', saveBatchZip);
    if ($('batch-load') && $('batch-file')) {
      $('batch-load').addEventListener('click', function () { $('batch-file').value = ''; $('batch-file').click(); });
      $('batch-file').addEventListener('change', function () {
        var file = this.files && this.files[0];
        this.value = '';
        loadRosterFile(file);
      });
    }
    if (win.AlloPacketVerify && typeof win.AlloPacketVerify.readParts === 'function' && typeof win.FileReader === 'function') {
      show('reopen', true);
      if ($('reopen-choose') && $('reopen-file')) {
        $('reopen-choose').addEventListener('click', function () { $('reopen-file').value = ''; $('reopen-file').click(); });
        $('reopen-file').addEventListener('change', function () {
          var file = this.files && this.files[0];
          this.value = '';
          if (!file) return;
          if (file.size > MAX_REOPEN_BYTES) { reopenNote('This file is too large to be a read-along file made here.'); return; }
          var done = function (buf) {
            var text = typeof win.TextDecoder === 'function' ? new win.TextDecoder('utf-8').decode(buf) : '';
            reopen(text, file.name, buf);
          };
          if (typeof file.arrayBuffer === 'function') {
            file.arrayBuffer().then(done, function () { reopenNote('This browser could not read the file.'); });
          } else {
            var reader = new win.FileReader();
            reader.onload = function () { reopen(String(reader.result || ''), file.name); };
            reader.onerror = function () { reopenNote('This browser could not read the file.'); };
            reader.readAsText(file);
          }
        });
      }
      if ($('reopen-page')) {
        $('reopen-page').addEventListener('click', function (event) {
          var handoff = win.AlloPacketHandoff;
          if (!reopenPending || !handoff || typeof handoff.redirect !== 'function') return;
          event.preventDefault();
          var target = reopenPending;
          reopenPending = null;
          handoff.redirect(target.file, target.href, target.hash).catch(function () { $('reopen-page').click(); });
        });
      }
    }
    // The recordings exist only on this page: ask before they are lost.
    win.addEventListener('beforeunload', function (event) { cancelMic(); if (state.unsaved) { event.preventDefault(); event.returnValue = ''; } });
    syncLangUi();
    readPassage();
    draw();
    drawBatch();
    takeHanded();
  }

  function takeHanded() {
    var handoff = win.AlloPacketHandoff;
    if (!handoff || typeof handoff.take !== 'function' || !win.location || win.location.hash !== handoff.HASH) return Promise.resolve(false);
    try { if (win.history && typeof win.history.replaceState === 'function') win.history.replaceState(null, '', win.location.href.split('#')[0]); } catch (_) {}
    return handoff.take().then(function (file) {
      if (!file) { reopenNote('The file is not here any more. Choose it with Open a file I made.'); return false; }
      var text = typeof win.TextDecoder === 'function' ? new win.TextDecoder('utf-8').decode(file.bytes) : '';
      return reopen(text, file.name, file.bytes);
    }, function () { reopenNote('This browser could not hand the file over. Choose it with Open a file I made.'); return false; });
  }

  win.AlloPacketReadAlongPage = { state: state, reopen: reopen, takeHanded: takeHanded };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
