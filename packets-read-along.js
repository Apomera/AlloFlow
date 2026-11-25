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
  var TRY_PAGE = 'packets-try.html', MP3_KBPS = 64, MIC_RATE = 22050, RECORD_MS = 30000, MAX_STUDENTS = 40, MAX_GLOSSARY_CLIPS = 25;
  var MAX_REOPEN_BYTES = 60 * 1024 * 1024;
  var MAX_ROSTER_BYTES = 256 * 1024;
  var PRESET_KEY = 'alloflow-ra-presets/1', MAX_PRESETS = 20, MAX_QUESTIONS = 6;
  var AUDIO_CLIP_RE = /^data:audio\/(?:mpeg|mp3|wav);base64,[A-Za-z0-9+/]+=*$/;
  // The app's English syllable table. A word it marks "check" (it is not sure of the break) is left whole.
  var table = (win.AlloModules && win.AlloModules.SyllableTableEn) || null;
  function syllablesOf(word) { var found = table ? table.lookup(word) : null; return found && !found.check ? found.parts : null; }
  function tableSource() { var src = table && table.source ? table.source : null; return src ? [src.moby, src.cmudict].filter(function (v) { return typeof v === 'string' && v; }).join('; checked against ') : ''; }
  // clips: { "the sentence": { uri, ms, voice, source } }, by the builder's key for a sentence.
  var state = { sentences: [], total: 0, clips: Object.create(null), customSupports: [], questions: [], nextQSeq: 1, supportClips: Object.create(null), glossaryClips: Object.create(null), draftSupImg: '', draftSupAlt: '', draftSupSet: '', draftSupCredit: '', nextSupSeq: 1, hiddenPics: Object.create(null), previewPage: 0, ready: false, getting: false, making: false, stop: null, makeRun: 0, mp3: false, playing: null, rec: null, built: null, baseHtml: '', made: null, fileUrl: '', unsaved: false };
  var buildTimer = 0;
  var previewSession = null;
  function stopPreview() {
    if (previewSession && typeof previewSession.stop === 'function') {
      try { previewSession.stop(); } catch (_) {}
    }
    previewSession = null;
  }
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
  function supportSpeechKey(sup) { return typeof builder.supportSpeechText === 'function' ? builder.supportSpeechText(sup) : ''; }
  function supportClipOf(sup) {
    var k = supportSpeechKey(sup);
    return k && Object.prototype.hasOwnProperty.call(state.supportClips, k) ? state.supportClips[k] : null;
  }
  function activeCustomSupports() {
    return (state.customSupports || []).filter(function (s) { return s && s.text && s.line >= 0 && s.line < state.sentences.length; });
  }
  function needingSupports() { return activeCustomSupports().filter(function (s) { return !supportClipOf(s); }); }
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
  function usePosExtended() { return usePos() && !!($('f-pos-extended') && $('f-pos-extended').checked); }
  function posScheme() {
    var v = ($('f-pos-scheme') && $('f-pos-scheme').value) || 'default';
    return typeof builder.cleanPosScheme === 'function' ? builder.cleanPosScheme(v) : v;
  }
  function posStyle() {
    var v = ($('f-pos-style') && $('f-pos-style').value) || 'underline';
    return typeof builder.cleanPosStyle === 'function' ? builder.cleanPosStyle(v) : v;
  }
  function posPalette() {
    if (posScheme() !== 'custom') return null;
    var raw = {
      n: $('f-pos-c-n') ? $('f-pos-c-n').value : '',
      v: $('f-pos-c-v') ? $('f-pos-c-v').value : '',
      j: $('f-pos-c-j') ? $('f-pos-c-j').value : '',
      a: $('f-pos-c-a') ? $('f-pos-c-a').value : '',
    };
    return typeof builder.cleanPosPalette === 'function' ? builder.cleanPosPalette(raw) : raw;
  }
  function defaultTools() {
    var raw = {};
    if ($('f-def-focus') && $('f-def-focus').value !== '') raw.focus = Number($('f-def-focus').value);
    if ($('f-def-font') && $('f-def-font').value !== '') raw.font = Number($('f-def-font').value);
    if ($('f-def-spacing') && $('f-def-spacing').value !== '') raw.spacing = Number($('f-def-spacing').value);
    if ($('f-def-colors') && $('f-def-colors').value !== '') raw.colors = Number($('f-def-colors').value);
    if (!Object.keys(raw).length) return null;
    return typeof builder.cleanDefaultTools === 'function' ? builder.cleanDefaultTools(raw) : raw;
  }
  function syncPosCustomizerUi() {
    var on = usePos();
    show('pos-customizer', on);
    show('pos-custom-colors', on && posScheme() === 'custom');
  }
  function useDict() { return isEnglish() && !!($('f-dict') && $('f-dict').checked); }
  function useNarrateGlossary() { return useDict() && !!($('f-narrate-glossary') && $('f-narrate-glossary').checked); }
  function useDictPics() { return isEnglish() && !!($('f-dict-pics') && $('f-dict-pics').checked); }
  function useSimpleBar() { return !!($('f-simple-bar') && $('f-simple-bar').checked); }
  function useStudentMic() { return !!($('f-student-mic') && $('f-student-mic').checked); }
  function useDeviceVoice() { return !!($('f-device-voice') && $('f-device-voice').checked); }
  function glossaryClipOf(key) {
    return key && Object.prototype.hasOwnProperty.call(state.glossaryClips, key) ? state.glossaryClips[key] : null;
  }
  function autoGlossaryEntries() {
    if (!useNarrateGlossary() || !state.sentences.length) return [];
    var bankReady = !!(win.AlloVocabBank && typeof win.AlloVocabBank.ready === 'function' && win.AlloVocabBank.ready());
    if (!bankReady || typeof builder.glossaryFor !== 'function') return [];
    var gloss = builder.glossaryFor(state.sentences, dictLookup, null, null, null);
    if (!gloss || typeof gloss !== 'object') return [];
    var customQuotes = Object.create(null);
    activeCustomSupports().forEach(function (sup) {
      if (!sup.quote) return;
      var qk = String(sup.quote).toLowerCase().replace(/\s+/g, ' ').trim();
      if (qk) customQuotes[qk] = true;
    });
    var keys = Object.keys(gloss), out = [];
    for (var i = 0; i < keys.length && out.length < MAX_GLOSSARY_CLIPS; i++) {
      var k = keys[i];
      if (!k || customQuotes[k]) continue;
      var entry = gloss[k];
      if (!entry || typeof entry.d !== 'string' || !entry.d.trim()) continue;
      var headWord = String(entry.w || k).trim() || k;
      var defText = entry.d.trim();
      out.push({ key: k, word: headWord, def: defText, spoken: headWord + '. ' + defText });
    }
    return out;
  }
  function needingGlossary() {
    return autoGlossaryEntries().filter(function (entry) { return !glossaryClipOf(entry.key); });
  }
  var dictLoading = null, picsLoading = null, symbolBank = null, extSymbolBank = null, loadedPicShards = Object.create(null), myPics = Object.create(null), myWordsWatched = false, supPicSearchSeq = 0;
  function getExtSymbolBank() {
    return win.AlloReadingSymbolsExt || (win.AlloModules && win.AlloModules.ReadingSymbolsExt) || extSymbolBank || null;
  }
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
  function localSvgRefusal(svg) {
    var s = typeof svg === 'string' ? svg : '';
    var stripped = s.replace(/^\s*<\?xml\s[^>]*\?>/i, '').replace(/^(?:\s*<!--[\s\S]*?-->)+/, '').trim();
    if (!/^\s*<svg[\s>]/i.test(stripped) || !/<\/svg>\s*$/i.test(stripped)) return 'not an SVG drawing';
    if (s.length > 300000 || s.indexOf('\\') >= 0) return 'invalid SVG';
    if (/<!(?:doctype|entity)/i.test(s) || /<\?(?!xml\s)/i.test(s)) return 'unsafe declaration';
    var plain = s.replace(/&#x([0-9a-f]+);?/gi, function (_, hex) { return String.fromCharCode(parseInt(hex, 16) & 0xFFFF); })
      .replace(/&#(\d+);?/g, function (_, dec) { return String.fromCharCode(Number(dec) & 0xFFFF); })
      .replace(/&(colon|newline|tab);/gi, function (_, name) { return name.toLowerCase() === 'colon' ? ':' : ''; });
    if (/<\s*(?:[^\s<>"'=/:]+:)?(?:script|foreignObject|iframe|embed|object|audio|video|animate\w*|set|handler|listener)\b/i.test(plain)) return 'disallowed element';
    if (/[\s"'\/]on[a-z]+\s*=/i.test(plain) || /(?:java|vb|live)script:/i.test(plain.replace(/[\x00-\x20]+/g, ''))) return 'script handler';
    if (/xml:base\s*=/i.test(plain) || /[\s"'\/]src(?:doc)?\s*=/i.test(plain)) return 'external reference';
    var m, hrefRe = /(?:[\s"'\/])(?:[^\s<>"'=/:]+:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/gi;
    while ((m = hrefRe.exec(plain))) {
      var val = String(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3] || '').replace(/[\x00-\x20]+/g, '');
      if (val.charAt(0) !== '#') return 'external link';
    }
    var urlRe = /url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))/gi;
    while ((m = urlRe.exec(plain))) {
      var uval = String(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3] || '').replace(/[\x00-\x20]+/g, '');
      if (uval.charAt(0) !== '#') return 'external url';
    }
    return '';
  }
  function svgToDataUri(svg) {
    if (typeof svg !== 'string' || !svg.trim()) return '';
    try {
      if (localSvgRefusal(svg)) return '';
      var refuser = (win.AlloPacketBuilder && win.AlloPacketBuilder.svgRefusal) || (win.AlloPacketMyWords && win.AlloPacketMyWords.svgRefusal);
      if (typeof refuser === 'function' && refuser(svg)) return '';
      var bytes = typeof win.TextEncoder === 'function' ? new win.TextEncoder().encode(svg) : null;
      if (bytes) {
        var bin = '';
        for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return 'data:image/svg+xml;base64,' + win.btoa(bin);
      }
      return 'data:image/svg+xml;base64,' + win.btoa(unescape(encodeURIComponent(svg)));
    } catch (_) { return ''; }
  }
  function normalizeDraftImageUri(rawUri) {
    if (typeof rawUri !== 'string' || !rawUri || rawUri.length > 360 * 1024) return '';
    var b64Match = /^data:image\/(png|jpeg|webp|svg\+xml);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(rawUri);
    if (b64Match && b64Match[2].length % 4 === 0 && rawUri.length <= 280 * 1024) {
      if (b64Match[1].toLowerCase() === 'svg+xml') {
        try {
          var bin = win.atob(b64Match[2]), bytes = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          var decoded = typeof win.TextDecoder === 'function' ? new win.TextDecoder('utf-8').decode(bytes) : decodeURIComponent(escape(bin));
          if (!decoded || localSvgRefusal(decoded)) return '';
        } catch (_) { return ''; }
      }
      return rawUri;
    }
    var utfSvg = /^data:image\/svg\+xml(?:;charset=utf-8)?,(.+)$/i.exec(rawUri);
    if (utfSvg) {
      try {
        var svgText = decodeURIComponent(utfSvg[1]);
        var converted = svgToDataUri(svgText);
        return converted && converted.length <= 280 * 1024 ? converted : '';
      } catch (_) { return ''; }
    }
    return '';
  }
  function getPictureMatcher() {
    return win.AlloWordPictureMatcher || (win.AlloModules && win.AlloModules.WordPictureMatcher) || null;
  }
  function picLookup(word, defEntry, opts) {
    var k = String(word || '').toLowerCase();
    if (!k || (state.hiddenPics && state.hiddenPics[k])) return null;
    // 1. Teacher's own saved picture (Find a picture / AlloPacketMyWords / inline Replace) always wins.
    if (Object.prototype.hasOwnProperty.call(myPics, k) && myPics[k]) return myPics[k];
    // 2. Exact match in bundled Mulberry Symbols / OpenMoji bank (core + extended reading symbols).
    if (symbolBank && typeof symbolBank.get === 'function') {
      var exact = symbolBank.get(k);
      if (exact && typeof exact.svg === 'string') {
        var exactUri = svgToDataUri(exact.svg);
        if (exactUri) return { uri: exactUri, label: exact.label || k, set: exact.set || 'mulberry' };
      }
    }
    var extBank = getExtSymbolBank();
    if (extBank && typeof extBank.get === 'function') {
      var exactExt = extBank.get(k);
      if (exactExt && typeof exactExt.svg === 'string') {
        var extUri = svgToDataUri(exactExt.svg);
        if (extUri) return { uri: extUri, label: exactExt.label || k, set: exactExt.set || 'mulberry' };
      }
    }
    // 3. Offline WordPictureMatcher: 696 K-12 curriculum SVG diagrams, WordNet semantic visual bridge, concept cues, irregular lemmas, compounds, and definition fallback.
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
      loadOptionalScript('reading_symbols_ext_en.js', !!(win.AlloReadingSymbolsExt || (win.AlloModules && win.AlloModules.ReadingSymbolsExt) || typeof win.createReadingSymbolsExt === 'function')),
      loadOptionalScript('word_picture_semantic_en.js', !!(win.AlloWordPictureSemantic || (win.AlloModules && win.AlloModules.WordPictureSemantic))),
      loadOptionalScript('word_picture_matcher.js', !!getPictureMatcher()),
      loadOptionalScript('packets_my_words.js', !!win.AlloPacketMyWords),
    ]).then(function () {
      if (!symbolBank && typeof win.createWordSoundsSymbols === 'function') symbolBank = win.createWordSoundsSymbols();
      var extBank = getExtSymbolBank() || (typeof win.createReadingSymbolsExt === 'function' ? win.createReadingSymbolsExt() : null);
      if (extBank) extSymbolBank = extBank;
      var store = win.AlloPacketMyWords;
      if (store && typeof store.onChange === 'function' && !myWordsWatched) {
        myWordsWatched = true;
        store.onChange(function () {
          if (useDictPics()) syncMyPictures().then(function () { refreshFile(); });
        });
      }
      var tasks = [syncMyPictures()];
      function fetchBankShards(bank) {
        if (!bank || !Array.isArray(bank.shards) || (bank.ready && bank.ready()) || typeof win.fetch !== 'function') return;
        var urls = bank.shards.map(function (sh) { return sh.url; }).filter(function (u) { return !loadedPicShards[u]; });
        urls.forEach(function (u) {
          var ctrl = typeof win.AbortController === 'function' ? new win.AbortController() : null;
          var timer = ctrl ? win.setTimeout(function () { try { ctrl.abort(); } catch (_) {} }, 15000) : null;
          var req = ctrl ? win.fetch(u, { signal: ctrl.signal }) : win.fetch(u);
          tasks.push(req.then(function (r) { return r && r.ok ? r.text() : null; }).then(function (txt) {
            if (!txt || txt.length > 8 * 1024 * 1024) return;
            var data = JSON.parse(txt, function (k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; });
            if (data && bank) { bank.add(data); loadedPicShards[u] = true; }
          }, function () {}).finally(function () { if (timer !== null) win.clearTimeout(timer); }));
        });
      }
      fetchBankShards(symbolBank);
      fetchBankShards(extBank);
      return Promise.all(tasks).then(function () { return true; });
    }).then(function () {
      picsLoading = null;
      if (!useDictPics()) setText('pics-said', '');
      return true;
    }, function () {
      picsLoading = null;
      if (useDictPics()) setText('pics-said', 'Could not load offline word pictures right now. The file still builds without pictures.');
      else setText('pics-said', '');
      return false;
    });
    return picsLoading;
  }
  function dictLookup(word) {
    var bank = win.AlloVocabBank;
    if (!bank || typeof bank.ready !== 'function' || !bank.ready()) return null;
    var wStr = String(word || '').trim();
    var list = (wStr.indexOf(' ') >= 0 && typeof bank.phraseSenses === 'function') ? bank.phraseSenses(wStr) : bank.senses(wStr);
    if (!Array.isArray(list) || !list.length) return null;
    var s = list[0];
    return { word: s.word || bank.head(wStr) || wStr, pos: s.pos || '', def: s.def || '', example: s.example || '', provenance: s.provenance || '' };
  }
  function posLookup(word) {
    var bank = win.AlloVocabBank;
    if (!bank || typeof bank.ready !== 'function' || !bank.ready()) return null;
    var list = bank.senses(word);
    if (!Array.isArray(list) || !list.length) return null;
    return list.map(function (s) { return s && s.pos ? s.pos : ''; }).filter(Boolean);
  }
  function ensureExtendedDictForPassage() {
    var bank = win.AlloVocabBank;
    if (!bank || typeof bank.ready !== 'function' || !bank.ready() || typeof bank.ensureForWords !== 'function') return Promise.resolve(false);
    var words = passageWordsList();
    if (!words.length) return Promise.resolve(true);
    var tasks = [bank.ensureForWords(words)];
    if (typeof bank.loadPhrases === 'function' && !(typeof bank.extReady === 'function' && bank.extReady('phrases'))) {
      tasks.push(bank.loadPhrases());
    }
    return Promise.all(tasks).then(function () { return true; }, function () { return false; });
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
    if (bank && typeof bank.ready === 'function' && bank.ready()) {
      return ensureExtendedDictForPassage().then(function () { return true; });
    }
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
      return ensureExtendedDictForPassage();
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
    var showNarrate = en && !!($('f-dict') && $('f-dict').checked);
    show('f-narrate-glossary-wrap', showNarrate);
    if ($('f-narrate-glossary')) $('f-narrate-glossary').disabled = !showNarrate;
    syncPosCustomizerUi();
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
    if (!list) return;
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
        splitLi.hidden = mode !== 'custom';
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
    syncSupportLineOptions();
    drawSupports();
    var need = needing().length;
    var needSup = needingSupports().length;
    var needGloss = needingGlossary().length;
    var makeAllBtn = $('make-all');
    if (makeAllBtn) {
      makeAllBtn.disabled = !state.ready || state.making || busyMic || !(need || needSup || needGloss);
      if (needGloss > 0) {
        var partsMake = [];
        if (need > 0) partsMake.push(count(need, 'sentence'));
        if (needSup > 0) partsMake.push(count(needSup, 'custom support'));
        partsMake.push(count(needGloss, 'word meaning'));
        makeAllBtn.textContent = 'Make recordings for ' + (partsMake.length === 1 ? partsMake[0] : (partsMake.length === 2 ? partsMake[0] + ' and ' + partsMake[1] : partsMake[0] + ', ' + partsMake[1] + ', and ' + partsMake[2]));
      } else if (needSup > 0 && need === 0) {
        makeAllBtn.textContent = 'Make recordings for ' + count(needSup, 'custom support');
      } else if (needSup > 0 && need > 0) {
        makeAllBtn.textContent = 'Make recordings for ' + count(need, 'sentence') + ' and ' + count(needSup, 'custom support');
      } else {
        makeAllBtn.textContent = need && need < state.sentences.length ? 'Make the recordings for the ' + count(need, 'sentence') + ' that ' + (need === 1 ? 'has' : 'have') + ' none'
          : need ? 'Make the recordings for ' + (need === 1 ? 'the sentence' : 'all ' + need + ' sentences') : 'Make the recordings';
      }
    }
    show('stop', state.making);
    var getVoiceBtn = $('get-voice');
    if (getVoiceBtn) {
      getVoiceBtn.disabled = state.getting || state.ready;
      if (state.ready) getVoiceBtn.textContent = 'The voice is ready';
    }
    if ($('hear-sample')) $('hear-sample').disabled = !state.ready || state.making || busyMic || !!state.sampling;
    if (!state.making && !busyMic) {
      if (!state.sentences.length) setText('make-said', state.ready ? 'Type a passage in step 1.' : 'Type a passage in step 1 first.');
      else if (!state.ready) setText('make-said', 'Record any sentence with your microphone below, get the computer voice in step 2, or save as a reading file without recordings in step 4.');
      else if (need === state.sentences.length) setText('make-said', 'The voice is ready. Press the button to make ' + (need === 1 ? 'the recording' : 'the ' + need + ' recordings') + '.');
    }
  }

  function syncSupportLineOptions() {
    var sel = $('sup-line');
    if (!sel) return;
    var prev = sel.value;
    sel.textContent = '';
    state.sentences.forEach(function (row, idx) {
      var opt = doc.createElement('option');
      opt.value = String(idx);
      var snip = row.text.length > 56 ? row.text.slice(0, 55).trim() + '\u2026' : row.text;
      opt.textContent = 'Sentence ' + (idx + 1) + ': ' + snip;
      sel.appendChild(opt);
    });
    if (prev && Number(prev) >= 0 && Number(prev) < state.sentences.length) sel.value = prev;
    else if (state.sentences.length) sel.value = '0';
    sel.disabled = !state.sentences.length;
    if ($('sup-add')) $('sup-add').disabled = !state.sentences.length;
  }
  function openSupportComposerForLine(idx) {
    var panel = $('custom-supports-panel');
    if (panel) panel.open = true;
    syncSupportLineOptions();
    if ($('sup-line') && idx >= 0 && idx < state.sentences.length) $('sup-line').value = String(idx);
    if ($('sup-quote')) $('sup-quote').focus();
  }
  function playAudioUri(uri, errTarget) {
    if (!uri) return;
    try { if (state.playing) state.playing.pause(); } catch (_) {}
    var audio = new win.Audio(uri);
    state.playing = audio;
    audio.play().catch(function () { setText(errTarget || 'make-problem', 'This browser could not play that recording.'); });
  }
  function recordSupport(sup) {
    if (!sup || state.making) return;
    var spKey = 'sup:' + supportSpeechKey(sup);
    if (state.rec && state.rec.key === spKey && state.rec.stage === 'recording') {
      try { if (state.rec.recorder && state.rec.recorder.state !== 'inactive') state.rec.recorder.stop(); } catch (_) {}
      return;
    }
    if (state.rec) return;
    try { if (state.playing) state.playing.pause(); } catch (_) {}
    setText('sup-problem', '');
    var media = win.navigator && win.navigator.mediaDevices;
    if (!media || typeof media.getUserMedia !== 'function' || typeof win.MediaRecorder !== 'function') {
      setText('sup-problem', 'This browser cannot record from a microphone here.');
      return;
    }
    var rec = { key: spKey, sup: sup, stage: 'asking', chunks: [], cancelled: false, timer: 0, stream: null, recorder: null };
    state.rec = rec;
    setText('sup-said', 'Allow the microphone to record this support.');
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
          releaseMic(); state.rec = null; setText('sup-problem', 'This browser could not start microphone recording.'); draw(); return;
        }
      }
      rec.recorder = recorder;
      recorder.onerror = function () {
        releaseMic(); if (state.rec !== rec) return; state.rec = null;
        setText('sup-problem', 'This browser could not finish microphone recording. Try again.'); draw();
      };
      recorder.ondataavailable = function (ev) { if (ev && ev.data && ev.data.size) rec.chunks.push(ev.data); };
      recorder.onstop = function () {
        releaseMic();
        if (rec.cancelled || state.rec !== rec) return;
        if (!rec.chunks.length) { state.rec = null; setText('sup-problem', 'Nothing was heard. Try again.'); draw(); return; }
        rec.stage = 'working';
        setText('sup-said', 'Finishing your support recording...');
        draw();
        var blobType = (rec.chunks[0] && rec.chunks[0].type) || recorder.mimeType || mime || 'audio/webm';
        var blob = new win.Blob(rec.chunks, { type: blobType });
        readBlobBuffer(blob).then(decodeRecording).then(function (samples) {
          if (state.rec !== rec) return null;
          var spoken = trimSilence(samples, MIC_RATE);
          if (!spoken) { state.rec = null; setText('sup-problem', 'Nothing was heard. Try again.'); draw(); return null; }
          var wav = encodeWavBytes(spoken, MIC_RATE);
          var ms = Math.round(spoken.length / MIC_RATE * 1000);
          var encode = state.mp3 ? Promise.resolve(true) : (engine && typeof engine.getMp3 === 'function' ? engine.getMp3() : Promise.resolve(false));
          return encode.then(function (hasMp3) {
            if (state.rec !== rec) return;
            if (hasMp3) state.mp3 = true;
            var mp3 = hasMp3 && engine && typeof engine.wavToMp3 === 'function' ? engine.wavToMp3(wav, MP3_KBPS) : null;
            var uri = mp3 ? engine.toDataUri(mp3, 'audio/mpeg') : ('data:audio/wav;base64,' + bytesToBase64(wav));
            if (uri.length > builder.MAX_CLIP_CHARS) { state.rec = null; setText('sup-problem', 'That recording is too long to keep.'); draw(); return; }
            state.supportClips[supportSpeechKey(sup)] = { uri: uri, ms: ms, voice: '', source: 'teacher' };
            state.unsaved = true;
            state.rec = null;
            setText('sup-said', 'Recorded support with your voice.');
            draw();
            refreshFile();
          });
        }).catch(function (err) {
          if (state.rec !== rec) return;
          state.rec = null;
          setText('sup-problem', said(err) || 'Could not keep that support recording.');
          draw();
        });
      };
      rec.stage = 'recording';
      recorder.start();
      rec.timer = win.setTimeout(function () { if (state.rec === rec && recorder.state === 'recording') { try { recorder.stop(); } catch (_) {} } }, RECORD_MS);
      setText('sup-said', 'Recording support now. Press Stop when done.');
      draw();
    }, function () {
      releaseMic();
      if (state.rec !== rec) return;
      state.rec = null;
      setText('sup-problem', 'Microphone permission was refused or no microphone is available.');
      draw();
    });
  }
  function makeOneSupport(sup, signal) {
    var voice = $('f-voice').value || 'af_heart';
    var spoken = supportSpeechKey(sup);
    if (!spoken) return Promise.resolve();
    if (signal && signal.aborted) return Promise.reject(abortError());
    return engine.speak(spoken, voice, { signal: signal }).then(function (wav) {
      if (signal && signal.aborted) throw abortError();
      var mp3 = state.mp3 ? engine.wavToMp3(wav, MP3_KBPS) : null;
      if (signal && signal.aborted) throw abortError();
      var uri = mp3 ? engine.toDataUri(mp3, 'audio/mpeg') : engine.toDataUri(wav, 'audio/wav');
      if (uri.length > builder.MAX_CLIP_CHARS) throw new Error('too long');
      state.supportClips[spoken] = { uri: uri, ms: engine.wavMs(wav), voice: voice, source: 'computer' };
      state.unsaved = true;
    });
  }
  function drawSupports() {
    var list = $('support-rows');
    var nowEl = $('custom-supports-now');
    var sups = activeCustomSupports();
    var recCount = sups.filter(function (s) { return !!supportClipOf(s); }).length;
    if (nowEl) {
      nowEl.textContent = sups.length ? (count(sups.length, 'support') + (recCount ? ' \u00b7 ' + recCount + ' recorded' : '')) : 'None added';
    }
    if (!list) return;
    list.textContent = '';
    var busyMic = !!state.rec;
    sups.forEach(function (sup) {
      var clip = supportClipOf(sup);
      var spKey = 'sup:' + supportSpeechKey(sup);
      var isThisRec = !!(state.rec && state.rec.key === spKey);
      var li = el('li', 'voice-row' + (clip ? ' is-made' : ''));
      li.setAttribute('data-support-row', sup.id);
      var meta = el('div', 'ra-sup-meta');
      if (sup.imgUri) {
        var img = doc.createElement('img');
        img.className = 'ra-sup-thumb';
        img.src = sup.imgUri;
        img.alt = sup.alt || sup.quote || 'Support picture';
        meta.appendChild(img);
      }
      var copy = el('div', 'ra-sup-copy');
      copy.appendChild(el('span', 'ra-sup-head', 'Sentence ' + (sup.line + 1) + (sup.quote ? ' \u2014 "' + sup.quote + '"' : '')));
      copy.appendChild(el('span', 'ra-sup-body', sup.text));
      meta.appendChild(copy);
      li.appendChild(meta);
      var statusText = isThisRec
        ? (state.rec.stage === 'recording' ? 'Recording now...' : 'Saving recording...')
        : (clip ? ('Recorded' + (clip.source === 'teacher' ? ' (your voice)' : ' (computer voice)') + '.') : 'No recording yet.');
      li.appendChild(el('span', 'voice-state', statusText));
      if (clip && !isThisRec) {
        var playBtn = el('button', 'btn btn-small', 'Play');
        playBtn.type = 'button';
        playBtn.setAttribute('data-sup-play', sup.id);
        playBtn.disabled = busyMic;
        playBtn.addEventListener('click', function () { playAudioUri(clip.uri, 'sup-problem'); });
        li.appendChild(playBtn);
      }
      var recBtn = el('button', 'btn btn-small', isThisRec && state.rec.stage === 'recording' ? 'Stop' : 'Record');
      recBtn.type = 'button';
      recBtn.setAttribute('data-sup-record', sup.id);
      recBtn.disabled = state.making || (busyMic && !(isThisRec && state.rec.stage === 'recording'));
      recBtn.addEventListener('click', function () { recordSupport(sup); });
      li.appendChild(recBtn);
      var mkBtn = el('button', 'btn btn-small', clip ? 'Make again' : 'Make with voice');
      mkBtn.type = 'button';
      mkBtn.setAttribute('data-sup-make', sup.id);
      mkBtn.disabled = !state.ready || state.making || busyMic;
      mkBtn.addEventListener('click', function () { makeSome([], 0, [sup]); });
      li.appendChild(mkBtn);
      var rmBtn = el('button', 'btn btn-small', 'Remove');
      rmBtn.type = 'button';
      rmBtn.setAttribute('data-sup-remove', sup.id);
      rmBtn.disabled = state.making || busyMic;
      rmBtn.addEventListener('click', function () {
        state.customSupports = state.customSupports.filter(function (x) { return x.id !== sup.id; });
        state.unsaved = true;
        draw();
        refreshFile();
      });
      li.appendChild(rmBtn);
      list.appendChild(li);
    });
  }
  function clearDraftSupportPic() {
    state.draftSupImg = '';
    state.draftSupAlt = '';
    state.draftSupSet = '';
    state.draftSupCredit = '';
    if ($('sup-pic-preview')) { $('sup-pic-preview').src = ''; $('sup-pic-preview').alt = ''; $('sup-pic-preview').hidden = true; }
    if ($('sup-pic-credit')) { $('sup-pic-credit').textContent = ''; $('sup-pic-credit').hidden = true; }
    if ($('sup-pic-clear')) $('sup-pic-clear').hidden = true;
  }
  function closeSupportPicPicker() {
    show('sup-pic-picker', false);
    if ($('sup-pic-offline')) $('sup-pic-offline').setAttribute('aria-expanded', 'false');
  }
  function selectDraftSupportPic(uri, altText, setName, creditNote) {
    if (!uri) return;
    state.draftSupImg = uri;
    state.draftSupAlt = String(altText || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    state.draftSupSet = String(setName || '').toLowerCase();
    state.draftSupCredit = String(creditNote || '').replace(/\s+/g, ' ').trim().slice(0, 180);
    if ($('sup-pic-preview')) {
      $('sup-pic-preview').src = uri;
      $('sup-pic-preview').alt = state.draftSupAlt || 'Support picture';
      $('sup-pic-preview').hidden = false;
    }
    if ($('sup-pic-credit')) {
      $('sup-pic-credit').textContent = state.draftSupCredit;
      $('sup-pic-credit').hidden = !state.draftSupCredit;
    }
    if ($('sup-pic-clear')) $('sup-pic-clear').hidden = false;
    closeSupportPicPicker();
    setText('sup-problem', '');
    setText('sup-said', 'Selected offline picture' + (state.draftSupAlt ? ': ' + state.draftSupAlt : '') + '.');
  }
  function defaultCreditForHit(hit) {
    if (hit && hit.credit) return String(hit.credit);
    var set = String((hit && hit.set) || '').toLowerCase();
    if (set === 'diagram' || (hit && hit.matchType === 'diagram')) return 'AlloFlow Curriculum Diagrams (AGPL-3.0)';
    if (set === 'openmoji') return 'OpenMoji 17.0.0 (CC BY-SA 4.0)';
    return 'Mulberry Symbols 3.6.1 (CC BY-SA 4.0)';
  }
  function renderSupportPicResults(hits, query) {
    var grid = $('sup-pic-results');
    if (!grid) return;
    grid.textContent = '';
    var usable = [];
    (Array.isArray(hits) ? hits : []).forEach(function (hit) {
      if (!hit || typeof hit.svg !== 'string') return;
      var uri = svgToDataUri(hit.svg);
      if (!uri) return;
      usable.push({
        uri: uri,
        word: String(hit.word || hit.label || ''),
        label: String(hit.label || hit.word || 'Picture'),
        alt: String(hit.alt || hit.label || hit.word || 'Support picture'),
        set: String(hit.set || (hit.matchType === 'diagram' ? 'diagram' : 'mulberry')).toLowerCase(),
        credit: defaultCreditForHit(hit),
      });
    });
    if (!usable.length) {
      setText('sup-pic-status', query ? ('No offline symbol or diagram matched "' + query + '". Try another word or choose a picture file.') : 'Type a word to search offline symbols and curriculum diagrams.');
      return;
    }
    setText('sup-pic-status', count(usable.length, 'offline picture') + (query ? (' for "' + query + '"') : '') + '. Select one to attach it.');
    usable.forEach(function (item) {
      var wrap = el('div', 'ra-sup-pick-item');
      wrap.setAttribute('role', 'listitem');
      var btn = el('button', 'ra-sup-pick-btn');
      btn.type = 'button';
      btn.setAttribute('data-sup-pick-word', item.word);
      btn.setAttribute('data-sup-pick-set', item.set);
      var kindLabel = item.set === 'diagram' ? 'Diagram' : 'Symbol';
      btn.setAttribute('aria-label', 'Attach ' + item.label + ' (' + kindLabel + ')');
      var img = doc.createElement('img');
      img.className = 'ra-sup-pick-img';
      img.src = item.uri;
      img.alt = '';
      btn.appendChild(img);
      btn.appendChild(el('span', 'ra-sup-pick-label', item.label));
      btn.appendChild(el('span', 'ra-sup-pick-kind', kindLabel));
      btn.addEventListener('click', function () {
        selectDraftSupportPic(item.uri, item.alt, item.set, item.credit);
      });
      wrap.appendChild(btn);
      grid.appendChild(wrap);
    });
  }
  function searchOfflineSupportPics(rawQuery) {
    var query = String(rawQuery || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    var seq = ++supPicSearchSeq;
    setText('sup-pic-status', 'Loading offline symbols and curriculum diagrams...');
    return ensurePictures().then(function () {
      if (seq !== supPicSearchSeq) return [];
      var matcher = getPictureMatcher();
      var extBank = getExtSymbolBank();
      var searchFn = matcher && (typeof matcher.searchSymbolsWithDiagrams === 'function'
        ? matcher.searchSymbolsWithDiagrams
        : (typeof matcher.searchSymbols === 'function' ? matcher.searchSymbols : null));
      var runSearch = searchFn
        ? Promise.resolve().then(function () {
            return searchFn.call(matcher, query, {
              symbols: symbolBank || extBank || null,
              readingSymbolsExt: extBank || null,
              preferDiagrams: true,
              limit: 18,
            });
          })
        : Promise.resolve([]);
      return runSearch.then(function (hits) {
        if (seq !== supPicSearchSeq) return [];
        var list = Array.isArray(hits) ? hits.slice() : [];
        if (!list.length && query && matcher && typeof matcher.getDiagram === 'function') {
          var one = matcher.getDiagram(query, '', query);
          if (one && typeof one.svg === 'string') list.push(one);
        }
        if (!list.length && !query && matcher && matcher.CURRICULUM_DIAGRAMS && typeof matcher.CURRICULUM_DIAGRAMS === 'object') {
          Object.keys(matcher.CURRICULUM_DIAGRAMS).slice(0, 18).forEach(function (k) {
            var d = matcher.CURRICULUM_DIAGRAMS[k];
            if (d && typeof d.svg === 'string') {
              list.push({ word: k, matchedKey: k, matchType: 'diagram', svg: d.svg, label: d.label || k, set: 'diagram', alt: d.label || k, credit: d.credit || '' });
            }
          });
        }
        renderSupportPicResults(list, query);
        return list;
      });
    }).catch(function () {
      if (seq === supPicSearchSeq) setText('sup-pic-status', 'Could not load offline symbols right now.');
      return [];
    });
  }
  function toggleSupportPicPicker() {
    var panel = $('sup-pic-picker');
    if (!panel) return;
    var opening = panel.hidden;
    panel.hidden = !opening;
    if ($('sup-pic-offline')) $('sup-pic-offline').setAttribute('aria-expanded', opening ? 'true' : 'false');
    if (!opening) return;
    var input = $('sup-pic-search');
    if (input) {
      var quoteVal = ($('sup-quote') && $('sup-quote').value) ? String($('sup-quote').value).trim() : '';
      if (quoteVal) input.value = quoteVal.slice(0, 60);
      input.focus();
      searchOfflineSupportPics(input.value);
    } else {
      searchOfflineSupportPics('');
    }
  }
  function addCustomSupportFromForm() {
    setText('sup-problem', '');
    setText('sup-said', '');
    if (!state.sentences.length) { setText('sup-problem', 'Type a passage in step 1 first.'); return; }
    var lineIdx = Math.floor(Number(($('sup-line') && $('sup-line').value) || 0));
    if (!isFinite(lineIdx) || lineIdx < 0 || lineIdx >= state.sentences.length) lineIdx = 0;
    var quote = builder.clipKey(($('sup-quote') && $('sup-quote').value) || '').slice(0, 80);
    var textVal = builder.clipKey(($('sup-text') && $('sup-text').value) || '').slice(0, 360);
    if (!textVal) { setText('sup-problem', 'Write an explanation or note before adding.'); if ($('sup-text')) $('sup-text').focus(); return; }
    var sup = {
      id: 'sup' + (state.nextSupSeq++),
      line: lineIdx,
      quote: quote,
      text: textVal,
      imgUri: state.draftSupImg || '',
      alt: state.draftSupAlt || quote || ('Note for sentence ' + (lineIdx + 1)),
      imgSet: state.draftSupSet || '',
      imgCredit: state.draftSupCredit || '',
    };
    state.customSupports.push(sup);
    clearDraftSupportPic();
    closeSupportPicPicker();
    if ($('sup-quote')) $('sup-quote').value = '';
    if ($('sup-text')) $('sup-text').value = '';
    state.unsaved = true;
    setText('sup-said', 'Added support for sentence ' + (lineIdx + 1) + '.');
    draw();
    refreshFile();
  }

  // ---------------------------------------------------------------------------
  // Optional Comprehension Check-In Questions (up to 6) & Saved Local Presets
  // ---------------------------------------------------------------------------
  function syncCheckKindUi() {
    var kind = ($('chk-kind') && $('chk-kind').value) || 'mc';
    show('chk-mc-fields', kind === 'mc');
  }
  function parseCheckChoices(raw) {
    var s = String(raw || '').trim();
    if (!s) return [];
    var parts = s.indexOf('\n') >= 0 ? s.split(/\r?\n/) : s.split(',');
    var out = [];
    for (var i = 0; i < parts.length && out.length < 4; i++) {
      var c = builder.clipKey(parts[i]).slice(0, 140);
      if (c) out.push(c);
    }
    return out;
  }
  function drawQuestions() {
    var list = $('chk-list');
    var nowEl = $('check-questions-now');
    var qs = Array.isArray(state.questions) ? state.questions : [];
    if (nowEl) nowEl.textContent = qs.length ? count(qs.length, 'question') : 'None added';
    if ($('chk-add')) $('chk-add').disabled = qs.length >= MAX_QUESTIONS;
    if (!list) return;
    list.textContent = '';
    qs.forEach(function (q, idx) {
      var li = el('li', 'voice-row');
      li.setAttribute('data-check-row', q.id);
      var copy = el('div', 'ra-sup-copy');
      var kindLabel = q.kind === 'mc' ? 'Multiple choice' : 'Open response';
      copy.appendChild(el('span', 'ra-sup-head', 'Question ' + (idx + 1) + ' (' + kindLabel + '): ' + q.prompt));
      if (q.kind === 'mc' && Array.isArray(q.choices) && q.choices.length) {
        var detail = q.choices.map(function (c, ci) {
          var mark = ci === q.answer ? ' [Correct]' : '';
          return wsLetterLabel(ci) + '. ' + c + mark;
        }).join('  |  ');
        copy.appendChild(el('span', 'ra-sup-body', detail));
      }
      li.appendChild(copy);
      var rmBtn = el('button', 'btn btn-small', 'Remove');
      rmBtn.type = 'button';
      rmBtn.setAttribute('data-chk-remove', q.id);
      rmBtn.addEventListener('click', function () {
        state.questions = (state.questions || []).filter(function (x) { return x.id !== q.id; });
        state.unsaved = true;
        drawQuestions();
        refreshFile();
      });
      li.appendChild(rmBtn);
      list.appendChild(li);
    });
  }
  function addCheckQuestionFromForm() {
    setText('chk-problem', '');
    setText('chk-said', '');
    if ((state.questions || []).length >= MAX_QUESTIONS) {
      setText('chk-problem', 'You can add up to ' + MAX_QUESTIONS + ' check-in questions.');
      return;
    }
    var prompt = builder.clipKey(($('chk-prompt') && $('chk-prompt').value) || '').slice(0, 240);
    if (!prompt) {
      setText('chk-problem', 'Write a question prompt before adding.');
      if ($('chk-prompt')) $('chk-prompt').focus();
      return;
    }
    var kind = ($('chk-kind') && $('chk-kind').value) === 'open' ? 'open' : 'mc';
    var q = { id: 'q' + (state.nextQSeq++), prompt: prompt, kind: kind };
    if (kind === 'mc') {
      var choices = parseCheckChoices($('chk-choices') && $('chk-choices').value);
      if (choices.length < 2) {
        setText('chk-problem', 'Enter 2 to 4 choices (one per line or comma-separated).');
        if ($('chk-choices')) $('chk-choices').focus();
        return;
      }
      var ans = Math.floor(Number(($('chk-answer') && $('chk-answer').value) || 0));
      if (!isFinite(ans) || ans < 0 || ans >= choices.length) ans = 0;
      q.choices = choices;
      q.answer = ans;
    }
    state.questions.push(q);
    if ($('chk-prompt')) $('chk-prompt').value = '';
    if ($('chk-choices')) $('chk-choices').value = '';
    if ($('chk-answer')) $('chk-answer').value = '0';
    state.unsaved = true;
    setText('chk-said', 'Added check-in question ' + state.questions.length + '.');
    drawQuestions();
    refreshFile();
  }

  function loadLocalPresets() {
    try {
      var raw = win.localStorage && win.localStorage.getItem(PRESET_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw, function (k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; });
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (p) { return p && typeof p.name === 'string' && p.name.trim() && p.data && typeof p.data === 'object'; }).slice(0, MAX_PRESETS);
    } catch (_) { return []; }
  }
  function writeLocalPresets(list) {
    try {
      if (win.localStorage) win.localStorage.setItem(PRESET_KEY, JSON.stringify((Array.isArray(list) ? list : []).slice(0, MAX_PRESETS)));
      return true;
    } catch (_) { return false; }
  }
  function capturePresetData() {
    return {
      pos: !!($('f-pos') && $('f-pos').checked),
      posScheme: posScheme(),
      posStyle: posStyle(),
      posExtended: !!($('f-pos-extended') && $('f-pos-extended').checked),
      posColors: {
        n: ($('f-pos-c-n') && $('f-pos-c-n').value) || '#7c3aed',
        v: ($('f-pos-c-v') && $('f-pos-c-v').value) || '#0f766e',
        j: ($('f-pos-c-j') && $('f-pos-c-j').value) || '#1d4ed8',
        a: ($('f-pos-c-a') && $('f-pos-c-a').value) || '#b45309',
      },
      defFocus: ($('f-def-focus') && $('f-def-focus').value) || '',
      defFont: ($('f-def-font') && $('f-def-font').value) || '',
      defSpacing: ($('f-def-spacing') && $('f-def-spacing').value) || '',
      defColors: ($('f-def-colors') && $('f-def-colors').value) || '',
      simpleBar: !!($('f-simple-bar') && $('f-simple-bar').checked),
      dict: !!($('f-dict') && $('f-dict').checked),
      narrateGlossary: !!($('f-narrate-glossary') && $('f-narrate-glossary').checked),
      dictPics: !!($('f-dict-pics') && $('f-dict-pics').checked),
      deviceVoice: !!($('f-device-voice') && $('f-device-voice').checked),
      studentMic: !!($('f-student-mic') && $('f-student-mic').checked),
      printSyl: !!($('print-syl') && $('print-syl').checked),
      printBold: !!($('print-bold') && $('print-bold').checked),
      printDict: !!($('print-dict') && $('print-dict').checked),
      printSupports: !($('print-supports') && !$('print-supports').checked),
    };
  }
  function applyPresetData(d) {
    if (!d || typeof d !== 'object') return;
    if ($('f-pos')) $('f-pos').checked = !!d.pos;
    if ($('f-pos-scheme') && typeof d.posScheme === 'string') $('f-pos-scheme').value = builder.cleanPosScheme ? builder.cleanPosScheme(d.posScheme) : d.posScheme;
    if ($('f-pos-style') && typeof d.posStyle === 'string') $('f-pos-style').value = builder.cleanPosStyle ? builder.cleanPosStyle(d.posStyle) : d.posStyle;
    if ($('f-pos-extended')) $('f-pos-extended').checked = !!d.posExtended;
    if (d.posColors && typeof d.posColors === 'object') {
      if ($('f-pos-c-n') && /^#[0-9a-f]{6}$/i.test(String(d.posColors.n || ''))) $('f-pos-c-n').value = d.posColors.n;
      if ($('f-pos-c-v') && /^#[0-9a-f]{6}$/i.test(String(d.posColors.v || ''))) $('f-pos-c-v').value = d.posColors.v;
      if ($('f-pos-c-j') && /^#[0-9a-f]{6}$/i.test(String(d.posColors.j || ''))) $('f-pos-c-j').value = d.posColors.j;
      if ($('f-pos-c-a') && /^#[0-9a-f]{6}$/i.test(String(d.posColors.a || ''))) $('f-pos-c-a').value = d.posColors.a;
    }
    if ($('f-def-focus')) $('f-def-focus').value = d.defFocus != null ? String(d.defFocus) : '';
    if ($('f-def-font')) $('f-def-font').value = d.defFont != null ? String(d.defFont) : '';
    if ($('f-def-spacing')) $('f-def-spacing').value = d.defSpacing != null ? String(d.defSpacing) : '';
    if ($('f-def-colors')) $('f-def-colors').value = d.defColors != null ? String(d.defColors) : '';
    if ($('f-simple-bar')) $('f-simple-bar').checked = !!d.simpleBar;
    if ($('f-dict')) $('f-dict').checked = !!d.dict;
    if ($('f-narrate-glossary')) $('f-narrate-glossary').checked = !!d.narrateGlossary;
    if ($('f-dict-pics')) $('f-dict-pics').checked = !!d.dictPics;
    if ($('f-device-voice')) $('f-device-voice').checked = !!d.deviceVoice;
    if ($('f-student-mic')) $('f-student-mic').checked = !!d.studentMic;
    if ($('print-syl')) $('print-syl').checked = !!d.printSyl;
    if ($('print-bold')) $('print-bold').checked = !!d.printBold;
    if ($('print-dict')) $('print-dict').checked = !!d.printDict;
    if ($('print-supports') && typeof d.printSupports === 'boolean') $('print-supports').checked = d.printSupports;
    state.unsaved = true;
    syncLangUi();
    syncSupportCards();
    if (useDict() || usePos()) {
      ensureDictionary().then(function () { if (!$('f-text')) return; draw(); refreshFile(); });
    }
    if (useDictPics()) {
      ensurePictures().then(function () { if (!$('f-text')) return; refreshFile(); });
    }
    refreshFile();
  }
  function renderPresetSelect(selectedName) {
    var sel = $('ra-preset-select');
    if (!sel) return;
    var list = loadLocalPresets();
    sel.textContent = '';
    var defOpt = doc.createElement('option');
    defOpt.value = '';
    defOpt.textContent = list.length ? 'Saved presets (' + list.length + ')...' : 'Saved presets...';
    sel.appendChild(defOpt);
    list.forEach(function (p) {
      var opt = doc.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
    if (selectedName && list.some(function (p) { return p.name === selectedName; })) sel.value = selectedName;
    else sel.value = '';
    if ($('ra-preset-delete')) $('ra-preset-delete').disabled = !sel.value;
  }
  function saveCurrentPreset() {
    var nameInput = $('ra-preset-name');
    var name = String((nameInput && nameInput.value) || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!name) {
      setText('ra-preset-said', 'Type a preset name first.');
      if (nameInput) nameInput.focus();
      return;
    }
    var list = loadLocalPresets().filter(function (p) { return p.name.toLowerCase() !== name.toLowerCase(); });
    list.unshift({ name: name, data: capturePresetData() });
    if (!writeLocalPresets(list)) {
      setText('ra-preset-said', 'Could not save preset in this browser.');
      return;
    }
    if (nameInput) nameInput.value = '';
    renderPresetSelect(name);
    setText('ra-preset-said', 'Saved preset "' + name + '" on this device.');
  }
  function deleteSelectedPreset() {
    var sel = $('ra-preset-select');
    var target = sel ? sel.value : '';
    if (!target) return;
    var list = loadLocalPresets().filter(function (p) { return p.name !== target; });
    writeLocalPresets(list);
    renderPresetSelect('');
    setText('ra-preset-said', 'Deleted preset "' + target + '".');
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
    // A late progress report after the download has failed or finished does not bring the bar back.
    if (!state.getting) return;
    var pct = info && typeof info.pct === 'number' ? Math.max(0, Math.min(1, info.pct)) : 0;
    show('voice-making', true);
    $('voice-bar').value = Math.round(pct * 100);
    setText('voice-line', (info && info.stage ? String(info.stage).slice(0, 120) : 'Getting the voice') + (pct ? ': ' + Math.round(pct * 100) + ' percent' : ''));
  }
  // The voice engine's own messages are plain sentences ("The list of voice files did not arrive."). Anything else is the
  // browser's wording ("Failed to fetch" when the download host is blocked) and is not shown.
  function voiceProblemText(error) {
    var why = said(error);
    var plain = /^The [^<>]{8,120}\.$/.test(why);
    var download = !plain || /did not arrive|timed out|did not start/.test(why);
    return (plain ? why : 'The computer voice could not be downloaded here.')
      + (download ? ' A school or office network may block the download (it comes from huggingface.co).' : '')
      + ' Nothing was changed, and your passage is still here. You can try again' + (download ? ', or try on another network' : '') + '.'
      + ' You can also make the file without the computer voice: record your own voice in step 3, or save it with no recordings.'
      + ' A file with no recordings still shows the passage with the Reading tools, and if you tick "Tap a word to hear it (local device voice)" in step 4 it can read with a voice already on the student\'s device.';
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
        // 2026-11-23: plain words, not the browser's own ("Failed to fetch"). What still works is said too.
        $('voice-bar').value = 0;
        setText('voice-line', '');
        setText('voice-problem', voiceProblemText(error));
        draw();
      });
  }

  function hearSample() {
    if (!state.ready || state.making || state.rec || state.sampling) return;
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

  function describePreview(lesson) {
    var out = [], blocks = lesson && Array.isArray(lesson.blocks) ? lesson.blocks : [];
    blocks.forEach(function (block) {
      (Array.isArray(block.items) ? block.items : []).forEach(function (item, idx) {
        var pageNum = item.page || (idx + 1);
        var firstLine = Array.isArray(item.lines) && item.lines[0] ? String(item.lines[0].text || '').trim() : String(item.word || '').trim();
        var snip = firstLine.length > 28 ? firstLine.slice(0, 27).trim() + '\u2026' : firstLine;
        out.push({
          itemId: String(item.id || ''),
          activity: String(block.activity || 'read_along'),
          word: snip,
          sample: false,
          label: 'Page ' + pageNum + (snip ? ' \u2014 ' + snip : ''),
          canSwap: false,
          canTogglePicture: false,
        });
      });
    });
    return out;
  }

  function syncSupportCards() {
    var items = [
      ['f-pos', 'Parts of speech'],
      ['f-dict', 'Word meanings'],
      ['f-dict-pics', 'Word pictures'],
      ['f-simple-bar', 'Simple toolbar'],
      ['f-device-voice', 'Device voice'],
      ['f-student-mic', 'Voice practice'],
    ];
    var on = [];
    items.forEach(function (pair) {
      var box = $(pair[0]);
      if (!box) return;
      var checked = !box.disabled && !!box.checked;
      var card = box.closest ? box.closest('.ra-support-card') : null;
      if (card) card.classList.toggle('is-on', checked);
      if (box.parentNode && box.parentNode.classList) box.parentNode.classList.toggle('is-on', checked);
      if (checked) on.push(pair[1]);
    });
    if (useNarrateGlossary()) on.push('spoken word meanings');
    var printOn = [];
    if ($('print-syl') && $('print-syl').checked && !$('print-syl-wrap').hidden) printOn.push('syllables on paper');
    if ($('print-bold') && $('print-bold').checked && !$('print-bold-wrap').hidden) printOn.push('bold starts on paper');
    if ($('print-dict') && $('print-dict').checked && !$('print-dict-wrap').hidden) printOn.push('meanings on paper');
    if ($('print-supports') && $('print-supports').checked && $('print-supports-wrap') && !$('print-supports-wrap').hidden) printOn.push('custom notes on paper');
    var summary = on.concat(printOn);
    // 2026-11-23: the simple toolbar is ticked on a new page, so nothing ticked is no longer "the default".
    setText('more-supports-now', summary.length ? summary.join(' \u00b7 ') : 'Syllables + Reading tools \u00b7 every button shown');
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
  function makeOneGlossary(entry, signal) {
    var voice = $('f-voice').value || 'af_heart';
    var spoken = entry && entry.spoken ? String(entry.spoken).trim() : '';
    if (!spoken) return Promise.resolve();
    if (signal && signal.aborted) return Promise.reject(abortError());
    return engine.speak(spoken, voice, { signal: signal }).then(function (wav) {
      if (signal && signal.aborted) throw abortError();
      var mp3 = state.mp3 ? engine.wavToMp3(wav, MP3_KBPS) : null;
      if (signal && signal.aborted) throw abortError();
      var uri = mp3 ? engine.toDataUri(mp3, 'audio/mpeg') : engine.toDataUri(wav, 'audio/wav');
      if (uri.length > builder.MAX_CLIP_CHARS) throw new Error('too long');
      state.glossaryClips[entry.key] = { uri: uri, ms: engine.wavMs(wav), voice: voice, source: 'computer' };
      state.unsaved = true;
    });
  }
  // rows: the sentences to record. one: the number of the sentence whose own button was pressed, when it was one.
  // supports: optional array of custom supports to synthesize with the same Kokoro voice.
  // glossaryEntries: optional array of auto-glossary entries (capped at MAX_GLOSSARY_CLIPS) to synthesize.
  function makeSome(rows, one, supports, glossaryEntries) {
    var sentList = Array.isArray(rows) ? rows : [];
    var supList = Array.isArray(supports) ? supports : [];
    var glossList = Array.isArray(glossaryEntries) ? glossaryEntries.slice(0, MAX_GLOSSARY_CLIPS) : [];
    var totalTasks = sentList.length + supList.length + glossList.length;
    if (state.making || state.rec || !state.ready || !totalTasks) return;
    var run = ++state.makeRun;
    var stop = makeController();
    state.making = true;
    state.stop = stop;
    clearBuilt();
    setText('make-problem', '');
    setText('sup-problem', '');
    setText('file-said', 'Making the recordings.');
    draw();
    var done = 0, failed = [], supFailed = 0, glossFailed = 0, stopped = false, numbers = sentList.map(function (row) { return state.sentences.indexOf(row) + 1; });
    var step = function (index) {
      if (run !== state.makeRun || stop.signal.aborted) { stopped = true; return Promise.resolve(); }
      if (index >= totalTasks) return Promise.resolve();
      setText('make-said', 'Making ' + (index + 1) + ' of ' + totalTasks + '.');
      if (index < sentList.length) {
        return makeOne(sentList[index], stop.signal).then(function () { done += 1; }, function (error) {
          if (run !== state.makeRun || stop.signal.aborted || (error && error.name === 'AbortError')) { stopped = true; return; }
          failed.push(numbers[index]);
        }).then(function () { return (stopped || run !== state.makeRun) ? null : step(index + 1); });
      }
      if (index < sentList.length + supList.length) {
        var sup = supList[index - sentList.length];
        return makeOneSupport(sup, stop.signal).then(function () { done += 1; }, function (error) {
          if (run !== state.makeRun || stop.signal.aborted || (error && error.name === 'AbortError')) { stopped = true; return; }
          supFailed += 1;
        }).then(function () { return (stopped || run !== state.makeRun) ? null : step(index + 1); });
      }
      var gEntry = glossList[index - sentList.length - supList.length];
      return makeOneGlossary(gEntry, stop.signal).then(function () { done += 1; }, function (error) {
        if (run !== state.makeRun || stop.signal.aborted || (error && error.name === 'AbortError')) { stopped = true; return; }
        glossFailed += 1;
      }).then(function () { return (stopped || run !== state.makeRun) ? null : step(index + 1); });
    };
    step(0).then(function () {
      if (run !== state.makeRun) return;
      state.making = false;
      if (state.stop === stop) state.stop = null;
      draw();
      setText('make-said', (stopped ? 'Stopped. ' : '') + count(done, 'recording') + ' made.' + (done ? ' Press Play to hear ' + (done === 1 ? 'it' : 'each one') + '.' : ''));
      if (failed.length) setText('make-problem', 'Not made: ' + (failed.length === 1 ? 'sentence ' : 'sentences ') + failed.join(', ') + '. The voice gave no sound it could keep. Press Make recording on a sentence to try again, or change the sentence.');
      if (supFailed) setText('sup-problem', count(supFailed, 'custom support recording') + ' could not be made. Try again or record with your microphone.');
      if (glossFailed && !failed.length) setText('make-problem', count(glossFailed, 'word meaning recording') + ' could not be made. The remaining word meanings still show as text.');
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
    var supNote = made.customSupports > 0 ? 'It has ' + count(made.customSupports, 'custom support') + '. ' : '';
    var micNote = made.studentMic ? 'Students can record and listen back to their own voice on their device only. ' : '';
    setText('file-sub', recNote + sylNote + posNote + dictNote + supNote + micNote + 'It will be saved as ' + state.built.name + '.');
    stopPreview();
    if (state.fileUrl) {
      $('try').setAttribute('href', TRY_PAGE + '#' + state.fileUrl);
      show('try', true);
      if (win.AlloPacketHandoff && typeof win.AlloPacketHandoff.hostPreview === 'function') {
        previewSession = win.AlloPacketHandoff.hostPreview({ url: state.fileUrl, html: html, describe: describePreview });
      }
    }
    show('save', true);
    show('download-bundle', !!(win.AlloPacketZip && typeof win.AlloPacketZip.create === 'function'));
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
      win.setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 60000);
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
    show('preview-worksheet', false);
    show('download-worksheet', false);
    show('worksheet-audio', false);
    show('print-syl-wrap', false);
    show('print-bold-wrap', false);
    show('print-dict-wrap', false);
    show('print-supports-wrap', false);
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
      if (!currentP || ((row.para || row.pageBreak) && idx > 0)) {
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
    var customSupsForPaper = activeCustomSupports();
    var withSupports = !($('print-supports') && !$('print-supports').checked);
    if (withSupports && customSupsForPaper.length) {
      var sBox = el('div', 'paper-gloss');
      sBox.setAttribute('data-paper-supports', '1');
      sBox.appendChild(el('h2', '', 'Notes & supports'));
      var sUl = el('ul', 'paper-gloss-list');
      customSupsForPaper.forEach(function (sup) {
        var li = el('li', 'paper-gloss-item');
        if (sup.imgUri) {
          var sImg = doc.createElement('img');
          sImg.className = 'paper-gloss-img';
          sImg.src = sup.imgUri;
          sImg.alt = sup.alt || sup.quote || 'Support picture';
          li.appendChild(sImg);
        }
        var sp = el('span', '');
        sp.appendChild(el('span', 'paper-gloss-word', (sup.quote ? sup.quote + ' (sentence ' + (sup.line + 1) + ')' : 'Sentence ' + (sup.line + 1)) + ': '));
        sp.appendChild(doc.createTextNode(sup.text));
        li.appendChild(sp);
        sUl.appendChild(li);
      });
      sBox.appendChild(sUl);
      sheet.appendChild(sBox);
    }
    paper.appendChild(sheet);
    doc.body.classList.add('paper-on');
    show('print', true);
    show('preview-worksheet', true);
    show('download-worksheet', true);
    show('worksheet-audio', !!(state.sentences.length && Object.keys(state.clips || {}).length > 0));
    show('download-bundle', !!(state.built && win.AlloPacketZip && typeof win.AlloPacketZip.create === 'function'));
    show('print-syl-wrap', !!(state.made && state.made.syllables));
    show('print-bold-wrap', true);
    show('print-dict-wrap', !!(state.made && state.made.dictionary));
    show('print-supports-wrap', customSupsForPaper.length > 0);
    syncSupportCards();
  }

  // ---------------------------------------------------------------------------
  // Read-Along Printable Student Worksheet HTML Builder & Classroom Bundle (.zip)
  // ---------------------------------------------------------------------------
  var WS_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'none'";
  var WS_IMG_RE = /^data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml)[;,]/i;

  function wsEsc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;';
    });
  }
  function wsSafeImg(uri) {
    var s = typeof uri === 'string' ? uri.trim() : '';
    return s && WS_IMG_RE.test(s) ? s : '';
  }
  function wsHash(text) {
    var h = 2166136261 >>> 0;
    var s = String(text || '');
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function wsShuffle(list, seedText) {
    var out = (Array.isArray(list) ? list : []).slice();
    var h = wsHash(seedText) || 1;
    for (var i = out.length - 1; i > 0; i--) {
      h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
      var j = h % (i + 1);
      var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }
  function wsLetterLabel(idx) {
    var n = Math.max(0, Math.floor(Number(idx) || 0));
    var out = '';
    do {
      out = String.fromCharCode(65 + (n % 26)) + out;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return out;
  }
  function wsBoldHtml(textStr, withBold) {
    if (!withBold) return wsEsc(textStr);
    var re = /[A-Za-z\u00C0-\u024F\u00b7]+/g, m, last = 0, out = '';
    while ((m = re.exec(textStr))) {
      if (m.index > last) out += wsEsc(textStr.slice(last, m.index));
      var tok = m[0];
      var plainLen = tok.replace(/\u00b7/g, '').length;
      if (plainLen < 2) {
        out += wsEsc(tok);
      } else {
        var targetLetters = plainLen <= 3 ? Math.max(1, plainLen - 1) : Math.ceil(plainLen * 0.45);
        var seen = 0, cutIdx = 0;
        for (var ci = 0; ci < tok.length; ci++) {
          if (tok[ci] !== '\u00b7') seen++;
          cutIdx = ci + 1;
          if (seen >= targetLetters) break;
        }
        out += '<strong>' + wsEsc(tok.slice(0, cutIdx)) + '</strong>' + (cutIdx < tok.length ? wsEsc(tok.slice(cutIdx)) : '');
      }
      last = m.index + tok.length;
    }
    if (last < textStr.length) out += wsEsc(textStr.slice(last));
    return out;
  }

  function buildReadAlongWorksheetHtml(opts) {
    var o = opts && typeof opts === 'object' ? opts : {};
    var titleText = String(o.title || 'Read along').replace(/\s+/g, ' ').trim() || 'Read along';
    var lang = String(o.lang || 'en').trim().toLowerCase() || 'en';
    var isRtl = !!(builder && typeof builder.isRtlLang === 'function' && builder.isRtlLang(lang));
    var sentences = Array.isArray(o.sentences) && o.sentences.length
      ? o.sentences
      : (typeof o.text === 'string' && o.text.trim() && builder && typeof builder.splitPassage === 'function'
          ? builder.splitPassage(o.text)
          : []);
    var showSyllables = !!o.showSyllables;
    var showBold = !!o.showBold;
    var showSupports = o.showSupports !== false;
    var includeAnswerKey = o.includeAnswerKey !== false;

    var sylFn = typeof o.syllableLookup === 'function' ? o.syllableLookup : (table ? syllablesOf : null);
    var langIsSpanish = lang === 'es';
    var langIsEnglish = lang === 'en';
    var formatSentence = function (rawText) {
      var textOut = String(rawText || '');
      if (showSyllables && builder && typeof builder.syllableText === 'function') {
        var syl = '';
        if (langIsSpanish && typeof builder.syllabifySpanish === 'function') {
          syl = builder.syllableText(textOut, builder.syllabifySpanish, { spanish: true });
        } else if (langIsEnglish && sylFn) {
          syl = builder.syllableText(textOut, sylFn);
        }
        if (syl) textOut = syl;
      }
      return wsBoldHtml(textOut, showBold);
    };

    // Part 1 — Read the Passage
    var passageHtmlParts = [];
    var currentPara = [];
    var flushPara = function () {
      if (!currentPara.length) return;
      passageHtmlParts.push('<p class="ws-para">' + currentPara.join(' ') + '</p>');
      currentPara = [];
    };
    sentences.forEach(function (row, idx) {
      if (!row || typeof row.text !== 'string' || !row.text.trim()) return;
      var formatted = formatSentence(row.text);
      if (row.heading === 1 || row.heading === 2 || row.heading === 3) {
        flushPara();
        passageHtmlParts.push('<h3 class="ws-subhead">' + formatted + '</h3>');
        return;
      }
      if ((row.para || row.pageBreak) && idx > 0) flushPara();
      currentPara.push(formatted);
    });
    flushPara();

    var readSubtitle = '';
    if (showSyllables && showBold) readSubtitle = 'Longer words are shown with syllable dots and bold word starts.';
    else if (showSyllables) readSubtitle = 'Longer words are shown with syllable dots.';
    else if (showBold) readSubtitle = 'Word starts are bolded to guide reading.';

    var partsHtml = [];
    partsHtml.push(
      '<section class="ws-section" data-ra-part="passage">'
      + '<div class="ws-section-head"><h2 class="ws-section-title">Part 1 \u2014 Read the Passage</h2>'
      + (readSubtitle ? '<p class="ws-directions">' + wsEsc(readSubtitle) + '</p>' : '')
      + '</div>'
      + '<div class="ws-passage"' + (isRtl ? ' dir="rtl"' : '') + '>'
      + (passageHtmlParts.length ? passageHtmlParts.join('') : '<p class="ws-para"></p>')
      + '</div></section>'
    );

    // Part 2 — Reading Notes & Visual Supports
    var cleanSupports = (Array.isArray(o.customSupports) ? o.customSupports : []).filter(function (sup) {
      return sup && typeof sup === 'object' && String(sup.text || '').trim();
    });
    if (showSupports && cleanSupports.length) {
      var supItemsHtml = cleanSupports.map(function (sup) {
        var safeUri = wsSafeImg(sup.imgUri);
        var label = sup.quote
          ? String(sup.quote).trim() + (sup.line != null ? ' (sentence ' + (Number(sup.line) + 1) + ')' : '')
          : (sup.line != null ? 'Sentence ' + (Number(sup.line) + 1) : 'Note');
        var imgTag = safeUri
          ? '<img class="ws-sup-img" src="' + wsEsc(safeUri) + '" alt="' + wsEsc(sup.alt || sup.quote || 'Support picture') + '">'
          : '';
        return '<li class="ws-sup-item">' + imgTag
          + '<div class="ws-sup-body"><strong class="ws-sup-quote">' + wsEsc(label) + ':</strong> '
          + '<span>' + wsEsc(String(sup.text || '').trim()) + '</span></div></li>';
      }).join('');
      partsHtml.push(
        '<section class="ws-section" data-ra-part="supports">'
        + '<div class="ws-section-head"><h2 class="ws-section-title">Part 2 \u2014 Reading Notes &amp; Visual Supports</h2>'
        + '<p class="ws-directions">Use these notes and pictures to help you understand the passage.</p></div>'
        + '<ul class="ws-sup-list">' + supItemsHtml + '</ul></section>'
      );
    }

    // Part 3 — Match the Key Words (from custom quoted supports and/or active passage word meanings)
    var keyWordItems = [];
    var seenKeyWords = Object.create(null);
    var addKeyWord = function (rawWord, rawMeaning) {
      var w = String(rawWord || '').replace(/\s+/g, ' ').trim();
      var m = String(rawMeaning || '').replace(/\s+/g, ' ').trim();
      if (!w || !m) return;
      var k = w.toLowerCase();
      if (seenKeyWords[k]) return;
      seenKeyWords[k] = true;
      keyWordItems.push({ word: w, meaning: m });
    };
    cleanSupports.forEach(function (sup) {
      if (sup.quote && sup.text) addKeyWord(sup.quote, sup.text);
    });
    if (Array.isArray(o.wordMeanings)) {
      o.wordMeanings.forEach(function (entry) {
        if (!entry || typeof entry !== 'object') return;
        addKeyWord(entry.word || entry.w, entry.meaning || entry.def || entry.d);
      });
    } else if (o.wordMeanings && typeof o.wordMeanings === 'object') {
      Object.keys(o.wordMeanings).sort().forEach(function (k) {
        var entry = o.wordMeanings[k];
        if (!entry || typeof entry !== 'object') return;
        addKeyWord(entry.word || entry.w || k, entry.meaning || entry.def || entry.d);
      });
    }

    var keyAnswerRows = [];
    if (keyWordItems.length >= 2) {
      var seedBase = titleText + '|' + keyWordItems.map(function (it) { return it.word; }).join(',');
      var shuffledDefs = wsShuffle(keyWordItems.map(function (it, idx) {
        return { idx: idx, word: it.word, meaning: it.meaning };
      }), 'ramatch|' + seedBase);
      if (shuffledDefs.every(function (d, i) { return d.idx === i; })) {
        shuffledDefs.push(shuffledDefs.shift());
      }
      var letterByIdx = Object.create(null);
      var defsColHtml = '<ol class="ws-match-defs">' + shuffledDefs.map(function (d, i) {
        var letter = wsLetterLabel(i);
        letterByIdx[d.idx] = letter;
        return '<li class="ws-match-def"><span class="ws-match-letter">' + wsEsc(letter) + '.</span><span>' + wsEsc(d.meaning) + '</span></li>';
      }).join('') + '</ol>';
      var wordsColHtml = '<ol class="ws-match-words">' + keyWordItems.map(function (it, idx) {
        keyAnswerRows.push({ num: idx + 1, word: it.word, letter: letterByIdx[idx] || '', meaning: it.meaning });
        return '<li class="ws-match-word"><span class="ws-num">' + (idx + 1) + '.</span><span class="ws-match-blank" aria-label="letter blank"></span><span class="ws-word">' + wsEsc(it.word) + '</span></li>';
      }).join('') + '</ol>';
      partsHtml.push(
        '<section class="ws-section" data-ra-part="matching">'
        + '<div class="ws-section-head"><h2 class="ws-section-title">Part 3 \u2014 Match the Key Words</h2>'
        + '<p class="ws-directions">Write the letter of the matching meaning on the line next to each word.</p></div>'
        + '<div class="ws-match-grid">' + wordsColHtml + defsColHtml + '</div></section>'
      );
    }

    // Part 4 — Comprehension Check-In Questions or Write About What You Read
    var cleanQs = (builder && typeof builder.cleanQuestions === 'function')
      ? builder.cleanQuestions(o.questions)
      : (Array.isArray(o.questions) ? o.questions.slice(0, 6) : []);
    var checkAnswerRows = [];
    if (cleanQs.length) {
      var qItemsHtml = cleanQs.map(function (q, qIdx) {
        if (q.kind === 'mc' && Array.isArray(q.choices) && q.choices.length) {
          var ansIdx = (typeof q.answer === 'number' && q.answer >= 0 && q.answer < q.choices.length) ? q.answer : 0;
          checkAnswerRows.push({ num: qIdx + 1, prompt: q.prompt, letter: wsLetterLabel(ansIdx), choice: q.choices[ansIdx], open: false });
          var chHtml = '<ul class="ws-mc-choices">' + q.choices.map(function (c, ci) {
            return '<li class="ws-mc-choice"><span class="ws-mc-box" aria-hidden="true"></span><span class="ws-match-letter">' + wsEsc(wsLetterLabel(ci)) + '.</span><span>' + wsEsc(c) + '</span></li>';
          }).join('') + '</ul>';
          return '<li class="ws-check-item"><p class="ws-check-prompt"><strong>' + (qIdx + 1) + '.</strong> ' + wsEsc(q.prompt) + '</p>' + chHtml + '</li>';
        }
        checkAnswerRows.push({ num: qIdx + 1, prompt: q.prompt, open: true });
        return '<li class="ws-check-item"><p class="ws-check-prompt"><strong>' + (qIdx + 1) + '.</strong> ' + wsEsc(q.prompt) + '</p><div class="ws-write-lines"><div class="ws-write-line"></div><div class="ws-write-line"></div></div></li>';
      }).join('');
      partsHtml.push(
        '<section class="ws-section" data-ra-part="writing">'
        + '<div class="ws-section-head"><h2 class="ws-section-title">Part 4 \u2014 Check Your Understanding</h2>'
        + '<p class="ws-directions">Answer each question below about what you read.</p></div>'
        + '<ol class="ws-check-list">' + qItemsHtml + '</ol></section>'
      );
    } else {
      var writeLines = '';
      for (var li = 0; li < 5; li++) writeLines += '<div class="ws-write-line"></div>';
      partsHtml.push(
        '<section class="ws-section" data-ra-part="writing">'
        + '<div class="ws-section-head"><h2 class="ws-section-title">Part 4 \u2014 Write About What You Read</h2>'
        + '<p class="ws-directions">Write a summary, main idea, or response about the passage on the lines below.</p></div>'
        + '<div class="ws-write-lines">' + writeLines + '</div></section>'
      );
    }

    // Teacher Answer Key (separate page when includeAnswerKey !== false and Part 3 or Part 4 has answers)
    var keyHtml = '';
    if (includeAnswerKey && (keyAnswerRows.length || checkAnswerRows.length)) {
      var keySections = [];
      if (keyAnswerRows.length) {
        var keyListHtml = '<ol class="ws-key-list">' + keyAnswerRows.map(function (row) {
          return '<li><strong>' + wsEsc(row.word) + '</strong> \u2014 ' + wsEsc(row.letter) + ' (' + wsEsc(row.meaning) + ')</li>';
        }).join('') + '</ol>';
        keySections.push('<h2>Part 3 \u2014 Match the Key Words</h2>' + keyListHtml);
      }
      if (checkAnswerRows.length) {
        var chkKeyHtml = '<ol class="ws-key-list">' + checkAnswerRows.map(function (row) {
          if (row.open) return '<li><strong>' + wsEsc(row.prompt) + '</strong> \u2014 Open response (answers will vary)</li>';
          return '<li><strong>' + wsEsc(row.prompt) + '</strong> \u2014 ' + wsEsc(row.letter) + '. ' + wsEsc(row.choice) + '</li>';
        }).join('') + '</ol>';
        keySections.push('<h2>Part 4 \u2014 Check Your Understanding</h2>' + chkKeyHtml);
      }
      keyHtml = '<section class="ws-key" data-answer-key="true">'
        + '<p class="ws-key-banner">Teacher Answer Key \u2014 keep apart from the student copy</p>'
        + keySections.join('')
        + '</section>';
    }

    var css = [
      '@page{margin:12mm}',
      '*{box-sizing:border-box}',
      'body{margin:0 auto;max-width:780px;padding:16px 20px;background:#ffffff;color:#000000;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55}',
      '.ws-header{border-bottom:2px solid #000000;padding-bottom:10px;margin-bottom:16px}',
      '.ws-title{margin:0 0 10px;font-size:22px;font-weight:700;color:#000000}',
      '.ws-meta{display:flex;flex-wrap:wrap;gap:10px 28px;font-size:14px;font-weight:700}',
      '.ws-meta-field{display:inline-flex;align-items:baseline;gap:8px;flex:1 1 200px}',
      '.ws-meta-line{flex:1 1 auto;border-bottom:1.5px solid #000000;min-width:110px;height:16px}',
      '.ws-section{margin-top:18px}',
      '.ws-section-head{break-after:avoid;page-break-after:avoid;margin-bottom:8px}',
      '.ws-section-title{margin:0 0 4px;font-size:17px;font-weight:700;color:#000000}',
      '.ws-directions{margin:0;font-size:13px;color:#000000}',
      '.ws-passage{padding:12px 14px;border:1.5px solid #000000;background:#ffffff;font-size:16px;line-height:1.75}',
      '.ws-subhead{margin:12px 0 6px;font-size:16px;font-weight:700;color:#000000}',
      '.ws-para{margin:0 0 10px}.ws-para:last-child{margin-bottom:0}',
      '.ws-sup-list{list-style:none;margin:8px 0 0;padding:0}',
      '.ws-sup-item{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #808080;break-inside:avoid;page-break-inside:avoid}',
      '.ws-sup-img{display:block;width:52px;height:52px;object-fit:contain;border:1px solid #808080;padding:2px;background:#ffffff;flex:none}',
      '.ws-sup-body{flex:1 1 auto;min-width:0;font-size:14px}',
      '.ws-sup-quote{font-weight:700}',
      '.ws-match-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:14px 20px;margin-top:10px}',
      '.ws-match-words,.ws-match-defs{list-style:none;margin:0;padding:0}',
      '.ws-match-word{display:flex;align-items:baseline;gap:8px;padding:7px 0;border-bottom:1px solid #808080;break-inside:avoid;page-break-inside:avoid}',
      '.ws-match-blank{display:inline-block;width:36px;border-bottom:1.5px solid #000000;flex:none}',
      '.ws-num{min-width:24px;font-weight:700}',
      '.ws-word{font-weight:700;font-size:15px}',
      '.ws-match-def{display:flex;align-items:baseline;gap:8px;padding:7px 0;border-bottom:1px solid #808080;font-size:14px;break-inside:avoid;page-break-inside:avoid}',
      '.ws-match-letter{min-width:22px;font-weight:700}',
      '.ws-write-lines{margin-top:10px}',
      '.ws-write-line{height:34px;border-bottom:1.5px solid #000000;border-top:1px dashed #808080;margin-bottom:6px}',
      '.ws-check-list{list-style:none;margin:10px 0 0;padding:0}',
      '.ws-check-item{margin:0 0 14px;break-inside:avoid;page-break-inside:avoid}',
      '.ws-check-prompt{margin:0 0 6px;font-size:15px}',
      '.ws-mc-choices{list-style:none;margin:4px 0 0 16px;padding:0}',
      '.ws-mc-choice{display:flex;align-items:baseline;gap:8px;margin:4px 0;font-size:14px}',
      '.ws-mc-box{display:inline-block;width:13px;height:13px;border:1.5px solid #000000;border-radius:50%;flex:none;position:relative;top:2px}',
      '.ws-key{break-before:page;page-break-before:always;margin-top:24px;padding-top:12px;border-top:2px solid #000000}',
      '.ws-key-banner{margin:0 0 12px;padding:8px 12px;border:2px solid #000000;font-size:14px;font-weight:700;background:#ffffff}',
      '.ws-key h2{margin:0 0 8px;font-size:17px}',
      '.ws-key-list{margin:6px 0 0;padding-left:24px;font-size:14px;line-height:1.6}',
      '.ws-key-list li{margin:4px 0;break-inside:avoid;page-break-inside:avoid}',
      '@media print{body{margin:0;max-width:none;padding:0}.ws-key{break-before:page;page-break-before:always;margin-top:0;border-top:none}}'
    ].join('');

    return '<!doctype html>\n<html lang="' + wsEsc(lang) + '"' + (isRtl ? ' dir="rtl"' : '') + '>\n<head>\n'
      + '<meta charset="utf-8">\n'
      + '<meta http-equiv="Content-Security-Policy" content="' + WS_CSP + '">\n'
      + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
      + '<title>' + wsEsc(titleText) + ' \u2014 Read-Along Worksheet</title>\n'
      + '<style>' + css + '</style>\n'
      + '</head>\n<body>\n'
      + '<header class="ws-header">'
      + '<h1 class="ws-title">' + wsEsc(titleText) + '</h1>'
      + '<div class="ws-meta">'
      + '<span class="ws-meta-field"><span>Name:</span><span class="ws-meta-line"></span></span>'
      + '<span class="ws-meta-field"><span>Date:</span><span class="ws-meta-line"></span></span>'
      + '</div></header>\n'
      + '<main>' + partsHtml.join('\n') + '</main>\n'
      + keyHtml
      + '\n</body>\n</html>\n';
  }

  function currentWorksheetOpts(includeAnswerKey) {
    var titleText = String(($('f-title') && $('f-title').value) || '').replace(/\s+/g, ' ').trim() || 'Read along';
    var mergedGlossary = Object.create(null);
    if (state.made && state.made.lesson && state.made.lesson.blocks && state.made.lesson.blocks[0]) {
      (state.made.lesson.blocks[0].items || []).forEach(function (it) {
        if (!it || !it.glossary) return;
        Object.keys(it.glossary).forEach(function (k) { if (!mergedGlossary[k]) mergedGlossary[k] = it.glossary[k]; });
      });
    }
    return {
      title: titleText,
      sentences: state.sentences,
      lang: passageLang(),
      showSyllables: !!($('print-syl') && $('print-syl').checked && (isSpanish() || table)),
      showBold: !!($('print-bold') && $('print-bold').checked),
      showSupports: !($('print-supports') && !$('print-supports').checked),
      customSupports: activeCustomSupports(),
      questions: (state.questions || []).slice(),
      wordMeanings: mergedGlossary,
      includeAnswerKey: includeAnswerKey !== false,
    };
  }

  function downloadWorksheet() {
    if (!state.sentences.length) return;
    var html = buildReadAlongWorksheetHtml(currentWorksheetOpts(true));
    var url = '';
    try { url = URL.createObjectURL(new Blob([html], { type: 'text/html' })); } catch (_) { url = ''; }
    if (!url) { setText('file-problem', 'This browser cannot save files from a page. Open this page in Chrome, Edge, Firefox or Safari.'); return; }
    download(url, titleStem() + '-read-along-worksheet.html');
    win.setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 10000);
  }
  var printCardsWait = null;
  function ensurePrintCards() {
    if (win.AlloPacketPrintCards && (typeof win.AlloPacketPrintCards.openReadAlongWorksheet === 'function' || typeof win.AlloPacketPrintCards.openReadAlongAudio === 'function')) {
      return Promise.resolve(win.AlloPacketPrintCards);
    }
    if (printCardsWait) return printCardsWait;
    printCardsWait = new Promise(function (resolve) {
      try {
        if (doc.head && !doc.querySelector('link[href="packets-print-cards.css"]')) {
          var lk = doc.createElement('link');
          lk.rel = 'stylesheet';
          lk.href = 'packets-print-cards.css';
          doc.head.appendChild(lk);
        }
        var sc = doc.createElement('script');
        sc.src = 'packets-print-cards.js';
        sc.onload = function () { resolve(win.AlloPacketPrintCards || null); };
        sc.onerror = function () { printCardsWait = null; resolve(null); };
        (doc.head || doc.body).appendChild(sc);
      } catch (_) {
        printCardsWait = null;
        resolve(null);
      }
    });
    return printCardsWait;
  }
  function currentReadAlongPreviewPayload() {
    var opts = currentWorksheetOpts(true);
    var mappedSentences = (state.sentences || []).map(function (row) {
      return Object.assign({}, row, { key: keyOf(row) });
    });
    var mappedSupports = (opts.customSupports || []).map(function (sup) {
      var clip = supportClipOf(sup);
      return clip && clip.uri ? Object.assign({}, sup, { audioUri: clip.uri }) : Object.assign({}, sup);
    });
    return Object.assign({}, opts, {
      sentences: mappedSentences,
      customSupports: mappedSupports,
      clips: state.clips || {},
      syllableLookup: table ? syllablesOf : null,
    });
  }
  function openReadAlongWorksheetPreview() {
    if (!state.sentences.length) return;
    setText('file-problem', '');
    var payload = currentReadAlongPreviewPayload();
    ensurePrintCards().then(function (cards) {
      if (cards && typeof cards.openReadAlongWorksheet === 'function') cards.openReadAlongWorksheet(payload);
      else setText('file-problem', 'The worksheet preview could not load. Load the page again.');
    });
  }
  function openReadAlongAudioPlayer() {
    if (!state.sentences.length) return;
    setText('file-problem', '');
    var payload = currentReadAlongPreviewPayload();
    ensurePrintCards().then(function (cards) {
      if (cards && typeof cards.openReadAlongAudio === 'function') cards.openReadAlongAudio(payload);
      else setText('file-problem', 'The worksheet audio player could not load. Load the page again.');
    });
  }

  function downloadClassroomBundle() {
    if (!state.built || !state.built.html) return;
    if (!win.AlloPacketZip || typeof win.AlloPacketZip.create !== 'function') {
      setText('file-problem', 'This page could not load the part that makes .zip files. Load the page again.');
      return;
    }
    try {
      var zip = win.AlloPacketZip.create();
      zip.add('01-Interactive-Read-Along.html', state.built.html);
      zip.add('02-Student-Worksheet.html', buildReadAlongWorksheetHtml(currentWorksheetOpts(false)));
      zip.add('03-Teacher-Answer-Key.html', buildReadAlongWorksheetHtml(currentWorksheetOpts(true)));
      var parts = zip.finish();
      var url = URL.createObjectURL(new Blob(parts, { type: 'application/zip' }));
      download(url, titleStem() + '-classroom-bundle.zip');
      win.setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 10000);
    } catch (error) {
      setText('file-problem', 'The classroom bundle .zip could not be made (' + said(error) + ').');
    }
  }
  function drawPreview() {
    var box = $('live-preview'), card = $('preview-card');
    if (!box || !card) return;
    if (!state.made || !state.made.lesson || !state.made.lesson.blocks || !state.made.lesson.blocks[0]) {
      box.hidden = true;
      card.textContent = '';
      show('preview-page-wrap', false);
      return;
    }
    var items = state.made.lesson.blocks[0].items || [];
    if (!items.length) {
      box.hidden = true;
      show('preview-page-wrap', false);
      return;
    }
    var idx = Math.max(0, Math.min(items.length - 1, Math.floor(Number(state.previewPage) || 0)));
    state.previewPage = idx;
    var item = items[idx];
    if (!item || !Array.isArray(item.lines) || !item.lines.length) {
      box.hidden = true;
      show('preview-page-wrap', false);
      return;
    }
    box.hidden = false;
    var sumEl = $('preview-summary');
    if (sumEl) sumEl.textContent = items.length > 1 ? ('Preview how students will see pages (1 to ' + items.length + ')') : 'Preview how students will see page 1';
    var pageSel = $('preview-page');
    if (pageSel) {
      pageSel.textContent = '';
      items.forEach(function (pg, pi) {
        var opt = doc.createElement('option');
        opt.value = String(pi);
        var hRow = Array.isArray(pg.lines) ? pg.lines.filter(function (l) { return l && l.heading; })[0] : null;
        var snip = hRow ? String(hRow.text || '').slice(0, 28) : '';
        opt.textContent = 'Page ' + (pi + 1) + (snip ? ' — ' + snip : '');
        pageSel.appendChild(opt);
      });
      pageSel.value = String(idx);
    }
    show('preview-page-wrap', items.length > 1);
    var hasSyl = item.lines.some(function (l) { return !!l.syl; });
    show('preview-syl-wrap', hasSyl);
    var showSyl = hasSyl && !!($('preview-syl') && $('preview-syl').checked);
    var modeLabel = pageMode() === 'scroll' ? 'All on one page (scroll down)' : ('Page ' + (idx + 1) + ' of ' + state.made.pages);
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
        if (!currentP || ((row.para || row.pageBreak) && idx > 0)) {
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
      var re = /[A-Za-z\u00C0-\u024F\u00b7]+(?:['\u2019][A-Za-z\u00C0-\u024F\u00b7]+)*/g, m, last = 0, wi = 0;
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
    stopPreview();
    show('try', false);
    show('save', false);
    show('preview-worksheet', false);
    show('download-worksheet', false);
    show('worksheet-audio', false);
    show('download-bundle', false);
    show('after-save', false);
    show('live-preview', false);
    clearPaper();
    setText('file-sub', '');
    setText('file-problem', '');
  }
  function refreshFile() {
    if (!$('f-text') || !$('f-title')) return;
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
    var customSupportsPayload = activeCustomSupports().map(function (sup) {
      var clip = supportClipOf(sup);
      if (clip && clip.voice && voices.indexOf(clip.voice) < 0) voices.push(clip.voice);
      return {
        id: sup.id,
        line: sup.line,
        quote: sup.quote || '',
        occ: sup.occ || 0,
        text: sup.text,
        imgUri: sup.imgUri || '',
        alt: sup.alt || '',
        imgSet: sup.imgSet || '',
        imgCredit: sup.imgCredit || '',
        audioUri: clip ? clip.uri : '',
        audioSource: clip ? clip.source : '',
      };
    });
    var glossaryAudioPayload = Object.create(null);
    if (dictReady && useNarrateGlossary()) {
      Object.keys(state.glossaryClips || {}).forEach(function (gk) {
        var gClip = state.glossaryClips[gk];
        if (!gClip || !gClip.uri) return;
        glossaryAudioPayload[gk] = { uri: gClip.uri, source: gClip.source === 'teacher' ? 'teacher' : 'computer' };
        if (gClip.voice && voices.indexOf(gClip.voice) < 0) voices.push(gClip.voice);
      });
    }
    var made, result;
    try {
      made = builder.lessonFromReadAlong({ loader: loader, title: $('f-title').value, sentences: state.sentences, clips: clips, clipSources: clipSources, timings: timings, customSupports: customSupportsPayload, glossaryAudio: glossaryAudioPayload, voice: voices.join(', '), lang: passageLang(), syllables: table ? syllablesOf : null, syllableSource: tableSource(), pageMode: pageMode(), partsOfSpeech: usePos(), posExtended: usePosExtended(), posScheme: posScheme(), posStyle: posStyle(), posPalette: posPalette(), defaultTools: defaultTools(), questions: (state.questions || []).slice(), posLookup: (usePos() && bankReady) ? posLookup : null, dictionary: dictReady ? dictLookup : null, pictures: picsReady ? picLookup : null, studentMic: useStudentMic(), deviceVoice: useDeviceVoice(), simpleBar: useSimpleBar() });
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
    if ($('f-pos-scheme')) $('f-pos-scheme').value = back.posScheme || 'default';
    if ($('f-pos-style')) $('f-pos-style').value = back.posStyle || 'underline';
    if ($('f-pos-extended')) $('f-pos-extended').checked = !!back.posExtended;
    if (back.posPalette && typeof back.posPalette === 'object') {
      if ($('f-pos-c-n') && back.posPalette.n) $('f-pos-c-n').value = back.posPalette.n;
      if ($('f-pos-c-v') && back.posPalette.v) $('f-pos-c-v').value = back.posPalette.v;
      if ($('f-pos-c-j') && back.posPalette.j) $('f-pos-c-j').value = back.posPalette.j;
      if ($('f-pos-c-a') && back.posPalette.a) $('f-pos-c-a').value = back.posPalette.a;
    }
    var dt = back.defaultTools && typeof back.defaultTools === 'object' ? back.defaultTools : null;
    if ($('f-def-focus')) $('f-def-focus').value = (dt && dt.focus != null) ? String(dt.focus) : '';
    if ($('f-def-font')) $('f-def-font').value = (dt && dt.font != null) ? String(dt.font) : '';
    if ($('f-def-spacing')) $('f-def-spacing').value = (dt && dt.spacing != null) ? String(dt.spacing) : '';
    if ($('f-def-colors')) $('f-def-colors').value = (dt && dt.colors != null) ? String(dt.colors) : '';
    state.questions = Array.isArray(back.questions) ? back.questions.slice(0, MAX_QUESTIONS) : [];
    state.nextQSeq = state.questions.length + 1;
    if (state.questions.length && $('check-questions-panel')) $('check-questions-panel').open = true;
    drawQuestions();
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
    state.customSupports = [];
    state.supportClips = Object.create(null);
    state.glossaryClips = Object.create(null);
    clearDraftSupportPic();
    closeSupportPicPicker();
    state.hiddenPics = Object.create(null);
    state.previewPage = 0;
    Object.keys(back.clips || {}).forEach(function (k) {
      var restoredTimings = back.timings && Object.prototype.hasOwnProperty.call(back.timings, k) && Array.isArray(back.timings[k]) && back.timings[k].length ? back.timings[k].slice() : null;
      state.clips[k] = { uri: back.clips[k], ms: 0, voice: back.voice || '', source: (back.clipSources && back.clipSources[k]) || 'computer', timings: restoredTimings };
    });
    var customQuoteKeys = Object.create(null);
    (back.customSupports || []).forEach(function (sup, idx) {
      var restored = {
        id: sup.id || ('sup' + (idx + 1)),
        line: sup.line,
        quote: sup.quote || '',
        occ: sup.occ || 0,
        text: sup.text,
        imgUri: sup.imgUri || '',
        alt: sup.alt || '',
      };
      if (restored.quote) {
        var qk = String(restored.quote).toLowerCase().replace(/\s+/g, ' ').trim();
        if (qk) customQuoteKeys[qk] = true;
      }
      state.customSupports.push(restored);
      if (sup.audioUri) {
        state.supportClips[supportSpeechKey(restored)] = { uri: sup.audioUri, ms: 0, voice: back.voice || '', source: sup.audioSource || 'computer' };
      }
    });
    if (back.dictionary && back.glossaryAudio && typeof back.glossaryAudio === 'object') {
      Object.keys(back.glossaryAudio).forEach(function (gk) {
        if (!gk || customQuoteKeys[gk]) return;
        var ga = back.glossaryAudio[gk];
        var gaUri = typeof ga === 'string' ? ga : (ga && typeof ga === 'object' ? ga.uri : '');
        var gaSrc = ga && typeof ga === 'object' && ga.source === 'teacher' ? 'teacher' : 'computer';
        if (typeof gaUri === 'string' && gaUri.length <= builder.MAX_CLIP_CHARS && AUDIO_CLIP_RE.test(gaUri)) {
          state.glossaryClips[gk] = { uri: gaUri, ms: 0, voice: back.voice || '', source: gaSrc };
        }
      });
    }
    if ($('f-narrate-glossary')) $('f-narrate-glossary').checked = Boolean(back.dictionary && Object.keys(state.glossaryClips).length > 0);
    state.nextSupSeq = state.customSupports.length + 1;
    if (state.customSupports.length && $('custom-supports-panel')) $('custom-supports-panel').open = true;
    if ($('f-batch-names')) {
      $('f-batch-names').value = back.learner || '';
      if (back.learner && $('batch')) $('batch').open = true;
    }
    state.unsaved = false;
    syncLangUi();
    syncSupportCards();
    readPassage();
    draw();
    if ((useDict() || usePos()) && !(win.AlloVocabBank && typeof win.AlloVocabBank.ready === 'function' && win.AlloVocabBank.ready())) {
      ensureDictionary().then(function () { if (!$('line-rows')) return; draw(); refreshFile(); });
    }
    if (useDictPics()) {
      ensurePictures().then(function () { if (!$('f-text')) return; refreshFile(); });
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
      // 2026-11-23: a typed passage is work that can be lost: the leave warning is armed (Save a file clears it).
      if (String($('f-text').value || '').trim()) state.unsaved = true;
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
    $('f-title').addEventListener('input', function () {
      if (String($('f-title').value || '').trim() || String($('f-text').value || '').trim()) state.unsaved = true;
      refreshSoon();
    });
    if ($('f-page-mode')) $('f-page-mode').addEventListener('change', function () { state.unsaved = true; readPassage(); draw(); refreshFile(); });
    if ($('f-lang')) $('f-lang').addEventListener('change', function () { state.unsaved = true; syncLangUi(); syncSupportCards(); draw(); refreshFile(); });
    if ($('f-pos')) $('f-pos').addEventListener('change', function () {
      state.unsaved = true;
      syncPosCustomizerUi();
      syncSupportCards();
      if (usePos()) { ensureDictionary().then(function () { if (!$('f-text')) return; refreshFile(); }); }
      refreshFile();
    });
    if ($('f-pos-scheme')) $('f-pos-scheme').addEventListener('change', function () { state.unsaved = true; syncPosCustomizerUi(); refreshFile(); });
    if ($('f-pos-style')) $('f-pos-style').addEventListener('change', function () { state.unsaved = true; refreshFile(); });
    if ($('f-pos-extended')) $('f-pos-extended').addEventListener('change', function () { state.unsaved = true; refreshFile(); });
    ['f-pos-c-n', 'f-pos-c-v', 'f-pos-c-j', 'f-pos-c-a'].forEach(function (cid) {
      if ($(cid)) $(cid).addEventListener('input', function () { state.unsaved = true; refreshSoon(); });
      if ($(cid)) $(cid).addEventListener('change', function () { state.unsaved = true; refreshFile(); });
    });
    ['f-def-focus', 'f-def-font', 'f-def-spacing', 'f-def-colors'].forEach(function (did) {
      if ($(did)) $(did).addEventListener('change', function () { state.unsaved = true; refreshFile(); });
    });
    if ($('ra-preset-select')) $('ra-preset-select').addEventListener('change', function () {
      var val = this.value;
      if ($('ra-preset-delete')) $('ra-preset-delete').disabled = !val;
      if (!val) return;
      var found = loadLocalPresets().filter(function (p) { return p.name === val; })[0];
      if (found) {
        applyPresetData(found.data);
        setText('ra-preset-said', 'Applied preset "' + found.name + '".');
      }
    });
    if ($('ra-preset-save')) $('ra-preset-save').addEventListener('click', saveCurrentPreset);
    if ($('ra-preset-delete')) $('ra-preset-delete').addEventListener('click', deleteSelectedPreset);
    if ($('chk-kind')) $('chk-kind').addEventListener('change', syncCheckKindUi);
    if ($('chk-add')) $('chk-add').addEventListener('click', addCheckQuestionFromForm);
    if ($('f-dict')) $('f-dict').addEventListener('change', function () {
      state.unsaved = true;
      syncLangUi();
      syncSupportCards();
      if (useDict()) { ensureDictionary().then(function () { if (!$('line-rows')) return; draw(); refreshFile(); }); }
      else { setText('dict-said', ''); draw(); refreshFile(); }
    });
    if ($('f-narrate-glossary')) $('f-narrate-glossary').addEventListener('change', function () {
      state.unsaved = true;
      syncSupportCards();
      if (useNarrateGlossary()) { ensureDictionary().then(function () { if (!$('line-rows')) return; draw(); refreshFile(); }); }
      else { draw(); refreshFile(); }
    });
    if ($('f-dict-pics')) $('f-dict-pics').addEventListener('change', function () {
      state.unsaved = true;
      syncSupportCards();
      if (useDictPics()) { ensurePictures().then(function () { if (!$('f-text')) return; refreshFile(); }); }
      else { setText('pics-said', ''); refreshFile(); }
    });
    if ($('f-simple-bar')) $('f-simple-bar').addEventListener('change', function () { state.unsaved = true; syncSupportCards(); refreshFile(); });
    if ($('preview-syl')) $('preview-syl').addEventListener('change', drawPreview);
    if ($('preview-page')) $('preview-page').addEventListener('change', function () {
      state.previewPage = Math.max(0, Math.floor(Number(this.value) || 0));
      drawPreview();
    });
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
        state.hiddenPics = Object.create(null);
        state.unsaved = true;
        refreshFile();
      }
    });
    if ($('f-student-mic')) $('f-student-mic').addEventListener('change', function () { state.unsaved = true; syncSupportCards(); refreshFile(); });
    if ($('f-device-voice')) $('f-device-voice').addEventListener('change', function () { state.unsaved = true; syncSupportCards(); refreshFile(); });
    $('get-voice').addEventListener('click', getVoice);
    if ($('hear-sample')) $('hear-sample').addEventListener('click', hearSample);
    $('make-all').addEventListener('click', function () {
      if (useNarrateGlossary() && !(win.AlloVocabBank && typeof win.AlloVocabBank.ready === 'function' && win.AlloVocabBank.ready())) {
        ensureDictionary().then(function () { makeSome(needing(), 0, needingSupports(), needingGlossary()); });
        return;
      }
      makeSome(needing(), 0, needingSupports(), needingGlossary());
    });
    if ($('sup-add')) $('sup-add').addEventListener('click', addCustomSupportFromForm);
    if ($('sup-pic-offline')) $('sup-pic-offline').addEventListener('click', toggleSupportPicPicker);
    if ($('sup-pic-picker-close')) $('sup-pic-picker-close').addEventListener('click', function () {
      closeSupportPicPicker();
      if ($('sup-pic-offline')) $('sup-pic-offline').focus();
    });
    if ($('sup-pic-search')) {
      $('sup-pic-search').addEventListener('input', function () { searchOfflineSupportPics(this.value); });
      $('sup-pic-search').addEventListener('keydown', function (ev) {
        if (ev && ev.key === 'Escape') {
          closeSupportPicPicker();
          if ($('sup-pic-offline')) $('sup-pic-offline').focus();
        }
      });
    }
    if ($('sup-pic-choose') && $('sup-pic-file')) {
      $('sup-pic-choose').addEventListener('click', function () { $('sup-pic-file').value = ''; $('sup-pic-file').click(); });
      $('sup-pic-file').addEventListener('change', function () {
        var file = this.files && this.files[0];
        this.value = '';
        if (!file) return;
        setText('sup-problem', '');
        var store = win.AlloPacketMyWords;
        var hasResizer = !!(store && typeof store.resizeToDataUri === 'function');
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
          var cleanUri = normalizeDraftImageUri(uri);
          if (!cleanUri) {
            setText('sup-problem', 'Choose a smaller PNG, JPG, WebP, or SVG picture.');
            return;
          }
          state.draftSupImg = cleanUri;
          state.draftSupAlt = '';
          state.draftSupSet = 'teacher';
          state.draftSupCredit = '';
          if ($('sup-pic-preview')) { $('sup-pic-preview').src = cleanUri; $('sup-pic-preview').alt = 'Support picture'; $('sup-pic-preview').hidden = false; }
          if ($('sup-pic-credit')) { $('sup-pic-credit').textContent = ''; $('sup-pic-credit').hidden = true; }
          if ($('sup-pic-clear')) $('sup-pic-clear').hidden = false;
          closeSupportPicPicker();
        }, function () {
          setText('sup-problem', 'Could not read that picture file.');
        });
      });
    }
    if ($('sup-pic-clear')) $('sup-pic-clear').addEventListener('click', clearDraftSupportPic);
    $('stop').addEventListener('click', function () { if (state.stop) state.stop.abort(); });
    $('save').addEventListener('click', saveFile);
    if ($('print')) $('print').addEventListener('click', function () { drawPaper(); if (typeof win.print === 'function') win.print(); });
    if ($('preview-worksheet')) $('preview-worksheet').addEventListener('click', openReadAlongWorksheetPreview);
    if ($('download-worksheet')) $('download-worksheet').addEventListener('click', downloadWorksheet);
    if ($('worksheet-audio')) $('worksheet-audio').addEventListener('click', openReadAlongAudioPlayer);
    if ($('download-bundle')) $('download-bundle').addEventListener('click', downloadClassroomBundle);
    if ($('print-syl')) $('print-syl').addEventListener('change', function () { syncSupportCards(); drawPaper(); });
    if ($('print-bold')) $('print-bold').addEventListener('change', function () { syncSupportCards(); drawPaper(); });
    if ($('print-dict')) $('print-dict').addEventListener('change', function () { syncSupportCards(); drawPaper(); });
    if ($('print-supports')) $('print-supports').addEventListener('change', function () { syncSupportCards(); drawPaper(); });
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
      var readReopenFile = function (file) {
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
      };
      if ($('reopen-choose') && $('reopen-file')) {
        $('reopen-choose').addEventListener('click', function () { $('reopen-file').value = ''; $('reopen-file').click(); });
        $('reopen-file').addEventListener('change', function () {
          var file = this.files && this.files[0];
          this.value = '';
          readReopenFile(file);
        });
      }
      if ($('reopen-close')) {
        $('reopen-close').addEventListener('click', function () {
          show('reopen-note', false);
          reopenPending = null;
          if ($('reopen-choose')) $('reopen-choose').focus();
        });
      }
      var dropHost = doc.querySelector('main') || doc.body;
      if (dropHost) {
        var hasFiles = function (e) {
          if (!e || !e.dataTransfer) return false;
          if (e.dataTransfer.files && e.dataTransfer.files.length) return true;
          return !!(e.dataTransfer.types && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0);
        };
        dropHost.addEventListener('dragover', function (e) { if (!hasFiles(e) || $('reopen').hidden) return; e.preventDefault(); $('reopen').classList.add('is-dropping'); });
        dropHost.addEventListener('dragleave', function (e) { if (!e.relatedTarget || !dropHost.contains(e.relatedTarget)) $('reopen').classList.remove('is-dropping'); });
        dropHost.addEventListener('drop', function (e) {
          $('reopen').classList.remove('is-dropping');
          if (!hasFiles(e) || $('reopen').hidden) return;
          var file = e.dataTransfer.files && e.dataTransfer.files[0];
          if (!file) return;
          e.preventDefault();
          readReopenFile(file);
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
    win.addEventListener('pagehide', stopPreview);
    syncLangUi();
    syncPosCustomizerUi();
    syncCheckKindUi();
    renderPresetSelect('');
    drawQuestions();
    syncSupportCards();
    readPassage();
    draw();
    drawBatch();
    takeHanded();
  }

  function importDraft(draft) {
    if (!draft || typeof draft !== 'object' || draft.kind !== 'read_along') return false;
    var rawText = typeof draft.text === 'string'
      ? draft.text.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\r\n?/g, '\n').slice(0, builder.MAX_CHARS)
      : '';
    if (!rawText.trim()) return false;
    cancelMic();
    cancelMake();
    if ($('f-title')) $('f-title').value = typeof draft.title === 'string' ? draft.title.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
    if ($('f-text')) $('f-text').value = rawText;
    if (typeof draft.lang === 'string' && $('f-lang')) {
      var cleanL = typeof builder.cleanLang === 'function' ? builder.cleanLang(draft.lang) : String(draft.lang).trim().toLowerCase();
      var langOpts = $('f-lang').options || [];
      for (var li = 0; li < langOpts.length; li++) {
        if (langOpts[li].value === cleanL) { $('f-lang').value = cleanL; break; }
      }
    }
    state.clips = Object.create(null);
    state.customSupports = [];
    state.supportClips = Object.create(null);
    state.glossaryClips = Object.create(null);
    clearDraftSupportPic();
    closeSupportPicPicker();
    state.hiddenPics = Object.create(null);
    state.previewPage = 0;
    syncLangUi();
    readPassage();
    if (draft.clips && typeof draft.clips === 'object' && !Array.isArray(draft.clips)) {
      Object.keys(draft.clips).forEach(function (k) {
        if (!k || k === '__proto__' || k === 'constructor' || k === 'prototype') return;
        var normKey = builder.clipKey(k);
        if (!normKey) return;
        var raw = draft.clips[k];
        var uri = typeof raw === 'string' ? raw : (raw && typeof raw === 'object' && typeof raw.uri === 'string' ? raw.uri : '');
        if (!uri || uri.length > builder.MAX_CLIP_CHARS || !AUDIO_CLIP_RE.test(uri)) return;
        var src = (raw && typeof raw === 'object' && raw.source === 'computer') ? 'computer' : 'teacher';
        state.clips[normKey] = { uri: uri, ms: 0, voice: '', source: src, timings: null };
      });
    }
    var supsIn = Array.isArray(draft.customSupports) ? draft.customSupports.slice(0, 120) : [];
    supsIn.forEach(function (sup) {
      if (!sup || typeof sup !== 'object' || Array.isArray(sup)) return;
      var sText = builder.clipKey(sup.text).slice(0, 360);
      if (!sText) return;
      var sQuote = builder.clipKey(sup.quote || '').slice(0, 80);
      var lineIdx = -1;
      if (sup.line != null && sup.line !== '') {
        var parsedLine = Math.floor(Number(sup.line));
        if (isFinite(parsedLine) && parsedLine >= 0 && parsedLine < state.sentences.length) lineIdx = parsedLine;
      }
      if (lineIdx < 0 && sQuote) {
        var needle = sQuote.toLowerCase();
        for (var si = 0; si < state.sentences.length; si++) {
          if (String(state.sentences[si].text || '').toLowerCase().indexOf(needle) >= 0) { lineIdx = si; break; }
        }
      }
      if (lineIdx < 0) lineIdx = 0;
      var imgUri = normalizeDraftImageUri(sup.imgUri);
      var restored = {
        id: 'sup' + (state.nextSupSeq++),
        line: lineIdx,
        quote: sQuote,
        occ: 0,
        text: sText,
        imgUri: imgUri,
        alt: builder.clipKey(sup.alt || sQuote || ('Note for sentence ' + (lineIdx + 1))).slice(0, 60),
      };
      state.customSupports.push(restored);
      if (typeof sup.audioUri === 'string' && sup.audioUri.length <= builder.MAX_CLIP_CHARS && AUDIO_CLIP_RE.test(sup.audioUri)) {
        var aSrc = sup.audioSource === 'computer' ? 'computer' : 'teacher';
        state.supportClips[supportSpeechKey(restored)] = { uri: sup.audioUri, ms: 0, voice: '', source: aSrc };
      }
    });
    if (state.customSupports.length && $('custom-supports-panel')) $('custom-supports-panel').open = true;
    state.unsaved = true;
    syncSupportCards();
    draw();
    refreshFile();
    show('reopen', true);
    reopenNote('Imported passage and supports from AlloFlow.');
    return true;
  }

  function takeHanded() {
    var handoff = win.AlloPacketHandoff;
    if (!handoff || !win.location) return Promise.resolve(false);
    var hash = win.location.hash;
    var draftHash = handoff.DRAFT_HASH || '#import-draft';
    if (hash === draftHash && typeof handoff.takeDraft === 'function') {
      try { if (win.history && typeof win.history.replaceState === 'function') win.history.replaceState(null, '', win.location.href.split('#')[0]); } catch (_) {}
      return handoff.takeDraft().then(function (draft) {
        if (!draft || typeof draft !== 'object' || draft.kind !== 'read_along') {
          show('reopen', true);
          reopenNote('The draft from AlloFlow is not here any more. Copy and paste your passage into step 1.');
          return false;
        }
        return importDraft(draft);
      }, function () {
        show('reopen', true);
        reopenNote('This browser could not bring the draft over. Copy and paste your passage into step 1.');
        return false;
      });
    }
    if (typeof handoff.take !== 'function' || hash !== handoff.HASH) return Promise.resolve(false);
    try { if (win.history && typeof win.history.replaceState === 'function') win.history.replaceState(null, '', win.location.href.split('#')[0]); } catch (_) {}
    return handoff.take().then(function (file) {
      if (!file) { reopenNote('The file is not here any more. Choose it with Open a file I made.'); return false; }
      var text = typeof win.TextDecoder === 'function' ? new win.TextDecoder('utf-8').decode(file.bytes) : '';
      return reopen(text, file.name, file.bytes);
    }, function () { reopenNote('This browser could not hand the file over. Choose it with Open a file I made.'); return false; });
  }

  win.AlloReadAlongWorksheet = { buildReadAlongWorksheetHtml: buildReadAlongWorksheetHtml, currentReadAlongPreviewPayload: currentReadAlongPreviewPayload };
  win.AlloPacketReadAlongPage = { state: state, reopen: reopen, importDraft: importDraft, takeHanded: takeHanded, currentReadAlongPreviewPayload: currentReadAlongPreviewPayload };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
