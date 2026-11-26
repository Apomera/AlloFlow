// The vocabulary maker (packets-vocab.html): type the words, check the questions, make one file.
// Everything happens in this tab. The page loads its own scripts and the word list (packets_vocab_bank_en.js and its
// data files, all from this site, the same files whatever words are typed); its rule (connect-src 'self') makes the
// browser refuse anything else. The page runs without AI, and there is no account and no cookie. What it keeps on the
// device is listed under "About this page": the last choices (STORE_KEY) and the teacher's changes to the questions
// (EDITS_KEY), both in this browser's local storage. The teacher code is never kept.
// The questions, their wrong answers and the checks on them come from packet_vocab_builder.js; this page shows them,
// keeps the teacher's changes and passes everything on.
// 2026-11-12: recordings made ahead of time for the words (the Word Sounds word store) and pictures (the Word Sounds
// picture set), both from this site through packets_vocab_media.js; and meanings found online on a page of their own
// (packets-vocab-lookup.html, the only Packets vocabulary page that may reach another site), read back from EDITS_KEY.
(function () {
  'use strict';

  var LOOKUP_PAGE = 'packets-vocab-lookup.html';
  var PICTURES_PAGE = 'packets-pictures.html';
  var VOICE_PAGE = 'packets-voice.html';
  var STORE_KEY = 'alloflow-packets-vocab/1';
  var EDITS_KEY = 'alloflow-packets-vocab-edits/1';
  var TRY_PAGE = 'packets-try.html';
  var MAX_TYPED = 2400;
  var MAX_STUDENTS = 40;
  var MAX_REOPEN_BYTES = 60 * 1024 * 1024;
  var MAX_ROSTER_BYTES = 256 * 1024;
  var MAX_CLIP_CHARS = 2 * 1024 * 1024;
  var MAX_KEPT = 2000;     // words whose changes are kept; the oldest go first
  var READY_AUDIO_RE = /^data:audio\/(?:wav|x-wav|wave|mpeg|mp3);base64,[A-Za-z0-9+/]+={0,2}$/i;
  var WAV_AUDIO_RE = /^data:audio\/(?:wav|x-wav|wave);base64,[A-Za-z0-9+/]+={0,2}$/i;
  var ANY_AUDIO_RE = /^data:audio\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/]+={0,2}$/i;
  var LARGE_FILE_BYTES = 10e6;
  var LARGE_FILE_SAID = 'This file is over 10 MB. Some email and school platforms block large files, and older phones open them slowly. Choose fewer words, turn off Recordings of the words, or leave out picture questions to make it smaller.';
  // BEGIN TYPE EXAMPLES (2026-11-18): one worked example under each kind of question, so a teacher sees what the student
  // is asked. q holds the question as the file asks it (word_sounds_take_home/check_adapters/vocab_*.js) and the items are
  // the builder's own sample questions (packet_vocab_builder.js SAMPLES); tests/packets_maker_examples.test.js checks both.
  var TYPE_EXAMPLES = {
    meaning: { shown: 'The word is apple.', q: 'What does this word mean?', a: 'a round fruit that grows on trees' },
    word: { shown: 'The meaning is "a seat for one person, with a back and four legs."', q: 'Which word has this meaning?', a: 'chair' },
    blank: { shown: 'The ___ barked at the cat.', q: 'Which word fits in the blank?', a: 'dog' },
    picture: { shown: 'The word is dog.', q: 'Which picture shows this word?', a: 'the picture of a dog' },
    picword: { shown: 'A picture of a dog is shown.', q: 'Which word goes with this picture?', a: 'dog' }
  };
  var typeExampleText = function (id) {
    var row = TYPE_EXAMPLES[id];
    return row ? 'Example: ' + row.shown + ' ' + row.q + ' Answer: ' + row.a + '.' : '';
  };
  // END TYPE EXAMPLES

  var doc = document;
  var $ = function (id) { return doc.getElementById(id); };
  var el = function (tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  var add = function (parent) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]); return parent; };
  var setText = function (id, text) { var node = $(id); if (node) node.textContent = text; };
  var show = function (id, on) { var node = $(id); if (node) node.hidden = !on; };
  var isObject = function (value) { return !!value && typeof value === 'object' && !Array.isArray(value); };
  var count = function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); };
  var listed = function (names) { return names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names.join(''); };
  var capital = function (text) { return text.charAt(0).toUpperCase() + text.slice(1); };
  var fileSize = function (bytes) { return bytes >= 1e6 ? (bytes / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1000)) + ' KB'; };
  var productName = function () { var node = $('product-name'); return node ? String(node.textContent || '').trim() : ''; };
  var said = function (error) { return String((error && error.message) || error || ''); };
  var button = function (text, className, onClick, label) {
    var b = el('button', 'btn ' + (className || 'btn-small'), text);
    b.type = 'button';
    if (label) b.setAttribute('aria-label', label);
    b.addEventListener('click', onClick);
    return b;
  };

  var loader, builder, bank = null, bankState = 'loading';
  var state = null, edits = null, rows = [], step = 1;
  var editing = null;      // the one text box open on the check screens: { key, what: 'def' | 'example' | 'wrong', i }
  var focusAfter = '';     // a selector to focus once the rows are drawn again
  var openMenus = Object.create(null);      // the words whose Change meaning menu is open, kept open when the rows are drawn again
  // 2026-11-13 (teacher-journey L7): on a phone each word's buttons wait behind one Change button (packets-vocab.css);
  // the words whose Change is open, kept open when the rows are drawn again. On a wider screen the buttons are always there.
  var changing = Object.create(null);
  var buildTimer = 0, buildRun = 0, built = null, fileUrl = '';
  // Meaning recordings of the last make (text -> MP3 address, or null), and its meanings with none: see meaningsFor in make().
  var meaningClipsNow = null, meaningsMissingNow = [], blankMissingNow = [];
  function picturesQueueInfo(wordList) {
    var clean = [], seen = Object.create(null);
    (Array.isArray(wordList) ? wordList : []).forEach(function (raw) {
      var w = myWords && typeof myWords.normalizeWord === 'function'
        ? myWords.normalizeWord(raw)
        : (function (s) { return /^[a-z]{2,24}$/.test(s) ? s : ''; }(String(raw == null ? '' : raw).trim().toLowerCase()));
      if (w && !seen[w]) { seen[w] = true; clean.push(w); }
    });
    if (!clean.length) return { href: '', count: 0 };
    var first = clean[0], rest = clean.slice(1, 50);
    return {
      href: PICTURES_PAGE + '#word=' + encodeURIComponent(first)
        + (rest.length ? '&more=' + rest.map(encodeURIComponent).join(',') : ''),
      count: clean.length
    };
  }
  function voiceMeaningsHref(list) {
    var clean = (Array.isArray(list) ? list : []).slice(0, 120);
    return clean.length ? VOICE_PAGE + '#meanings=' + encodeURIComponent(JSON.stringify(clean)) : VOICE_PAGE;
  }
  function vocabMissingPictureWords() {
    return rows.filter(function (r) {
      return r && !r.picture && !r.customPicture && !r.pictureOff;
    }).map(function (r) { return r.word; });
  }
  function syncVocabMissingPicturesLink() {
    var link = $('vocab-find-missing-pics');
    if (!link) return;
    var q = picturesQueueInfo(vocabMissingPictureWords());
    if (q.href) {
      link.href = q.href;
      link.textContent = q.count === 1
        ? 'Find a picture for the 1 missing word'
        : 'Find pictures for the ' + q.count + ' missing words';
      link.appendChild(el('span', 'sr-only', ' (opens in a new tab)'));
      link.hidden = false;
      show('vocab-find-missing-pics-row', true);
    } else {
      link.href = PICTURES_PAGE;
      link.hidden = true;
      show('vocab-find-missing-pics-row', false);
    }
  }
  function usableBlankSentences() {
    var squeeze = function (t) { return String(t).replace(/\s+/g, ' ').trim(); };
    var out = [];
    rows.forEach(function (r) {
      if (!r || !r.blank || !r.blank.ask || builder.rowStop(r, 'blank')) return;
      var s = squeeze(r.blank.ask);
      if (s && out.indexOf(s) < 0) out.push(s);
    });
    return out;
  }
  function drawBlankKokoroCallout() {
    var box = $('blank-kokoro-callout');
    if (!box) return;
    var on = state && state.types.indexOf('blank') >= 0 && state.readAloud && state.voices;
    var missing = on ? blankMissingNow.slice(0, 120) : [];
    if (!missing.length) {
      box.hidden = true;
      box.textContent = '';
      return;
    }
    box.textContent = '';
    var n = missing.length;
    var msg = n === 1
      ? '1 fill-in-the-blank sentence uses the device voice right now \u2014 generate Kokoro voices in 1 click. '
      : n + ' fill-in-the-blank sentences use the device voice right now \u2014 generate Kokoro voices in 1 click. ';
    box.appendChild(doc.createTextNode(msg));
    var link = el('a', 'btn btn-small', 'Generate Kokoro voices');
    link.id = 'blank-kokoro-link';
    link.href = voiceMeaningsHref(missing);
    link.target = '_blank';
    link.rel = 'noopener';
    link.appendChild(el('span', 'sr-only', ' (opens in a new tab)'));
    box.appendChild(link);
    box.hidden = false;
  }
  var wordsTimer = 0;
  // Recordings and pictures (packets_vocab_media.js, word_sounds_symbols_en.js, reading_symbols_ext_en.js, word_picture_semantic_en.js, word_sounds_packet_builder.js, word_picture_matcher.js, packets_my_words.js).
  var media = null, symbols = null, extSymbols = null, semantic = null, art = null, matcher = null, myWords = null, pictureState = 'idle', heard = null, pendingPicWord = '';
  function getSymbolEntry(word) {
    var got = null;
    if (symbols && pictureState === 'ready') { try { got = symbols.get(word); } catch (_) { got = null; } }
    if (!got && extSymbols && typeof extSymbols.get === 'function') { try { got = extSymbols.get(word); } catch (_) { got = null; } }
    return got;
  }
  var myPictures = Object.create(null), myClips = Object.create(null), myClipPortable = Object.create(null), myPicSyncRun = 0, vocabAudioKitWait = null;
  var previewOmit = Object.create(null), previewSlot = Object.create(null), previewSession = null, inPreviewAction = false;
  function readJsonSafe(raw) {
    return JSON.parse(raw, function (k, v) {
      return k === '__proto__' ? undefined : v;
    });
  }
  function stopPreviewSession() {
    if (previewSession) { try { previewSession.stop(); } catch (_) {} previewSession = null; }
  }
  function resetPreview(stopSession) {
    previewOmit = Object.create(null);
    previewSlot = Object.create(null);
    if (stopSession) stopPreviewSession();
  }
  function activePreviewOmits() {
    var activeActs = Object.create(null);
    typesNow().forEach(function (id) {
      var t = builder.TYPES.filter(function (x) { return x.id === id; })[0];
      if (t) activeActs[t.activity] = true;
    });
    var rowKeys = Object.create(null);
    rows.forEach(function (r) { if (r && r.key) rowKeys[r.key] = true; });
    return Object.keys(previewOmit).filter(function (k) {
      var bar = k.indexOf('|');
      if (bar < 0) return false;
      return !!activeActs[k.slice(0, bar)] && !!rowKeys[k.slice(bar + 1)];
    });
  }

  function defaults() { return { words: '', types: ['meaning', 'word'], mode: 'practice', title: '', readAloud: true, voices: true, diagrams: false, repeatMissed: false, mix: true, mixSeed: null, codeName: '' }; }

  // ---------------------------------------------------------------------------
  // What this page keeps, in this browser only
  // ---------------------------------------------------------------------------
  function remember() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, words: state.words, types: state.types, mode: state.mode, title: state.title, readAloud: state.readAloud, voices: state.voices, diagrams: !!state.diagrams, repeatMissed: !!state.repeatMissed, mix: state.mix !== false, mixSeed: typeof state.mixSeed === 'number' && isFinite(state.mixSeed) ? Math.floor(state.mixSeed) : null }));
    } catch (_) { /* a browser that cannot keep them still works */ }
  }
  function recall() {
    var fresh = defaults(), saved = null;
    try { saved = readJsonSafe(window.localStorage.getItem(STORE_KEY) || 'null'); } catch (_) { saved = null; }
    if (!isObject(saved) || saved.v !== 1) return fresh;
    if (typeof saved.words === 'string') fresh.words = saved.words.slice(0, MAX_TYPED);
    if (Array.isArray(saved.types)) fresh.types = builder.TYPES.map(function (t) { return t.id; }).filter(function (id) { return saved.types.indexOf(id) >= 0; });
    if (saved.mode === 'practice' || saved.mode === 'check') fresh.mode = saved.mode;
    if (typeof saved.title === 'string') fresh.title = saved.title.slice(0, 80);
    if (typeof saved.readAloud === 'boolean') fresh.readAloud = saved.readAloud;
    if (typeof saved.voices === 'boolean') fresh.voices = saved.voices;
    if (typeof saved.diagrams === 'boolean') fresh.diagrams = saved.diagrams;
    if (saved.repeatMissed === true) fresh.repeatMissed = true;
    if (typeof saved.mix === 'boolean') fresh.mix = saved.mix;
    if (typeof saved.mixSeed === 'number' && isFinite(saved.mixSeed)) fresh.mixSeed = Math.floor(saved.mixSeed);
    return fresh;
  }
  function freshEdits() { return { v: 1, words: Object.create(null), senses: Object.create(null) }; }
  function recallEdits() {
    var saved = null;
    try { saved = readJsonSafe(window.localStorage.getItem(EDITS_KEY) || 'null'); } catch (_) { saved = null; }
    if (!isObject(saved) || saved.v !== 1) return freshEdits();
    var wordsMap = Object.create(null), sensesMap = Object.create(null);
    if (isObject(saved.words)) Object.keys(saved.words).forEach(function (k) { wordsMap[k] = saved.words[k]; });
    if (isObject(saved.senses)) Object.keys(saved.senses).forEach(function (k) { sensesMap[k] = saved.senses[k]; });
    var out = { v: 1, words: wordsMap, senses: sensesMap };
    Object.keys(out.words).forEach(function (k) {
      var w = out.words[k];
      if (isObject(w) && w.customPicture) {
        var uri = typeof w.customPicture === 'string' ? w.customPicture : (isObject(w.customPicture) && typeof w.customPicture.dataUri === 'string' ? w.customPicture.dataUri : '');
        if (uri && !myPictures[k]) myPictures[k] = { dataUri: uri, credit: { own: true }, legacy: true };
      }
    });
    return out;
  }
  function keepEdits() {
    var keys = Object.keys(edits.words);
    if (keys.length > MAX_KEPT) keys.sort(function (a, b) { return (edits.words[a].at || 0) - (edits.words[b].at || 0); }).slice(0, keys.length - MAX_KEPT).forEach(function (k) { delete edits.words[k]; });
    // Keep only lightweight text edits in localStorage; binary pictures live in AlloPacketMyWords IndexedDB.
    var cleanWords = {};
    Object.keys(edits.words).forEach(function (k) {
      var src = edits.words[k];
      if (!isObject(src)) return;
      var copy = {};
      Object.keys(src).forEach(function (field) { if (field !== 'customPicture') copy[field] = src[field]; });
      if (Object.keys(copy).length) cleanWords[k] = copy;
    });
    try { window.localStorage.setItem(EDITS_KEY, JSON.stringify({ v: 1, words: cleanWords, senses: edits.senses })); } catch (_) { /* kept for this visit only */ }
  }
  function wordEdit(key) {
    if (!isObject(edits.words[key])) edits.words[key] = {};
    edits.words[key].at = Date.now();
    return edits.words[key];
  }
  function senseEdit(id) { if (!isObject(edits.senses[id])) edits.senses[id] = {}; return edits.senses[id]; }
  function effectiveEdits() {
    var mergedWords = {};
    Object.keys(edits.words).forEach(function (k) {
      var src = edits.words[k];
      if (!isObject(src)) return;
      var copy = Object.assign({}, src);
      delete copy.customPicture;
      mergedWords[k] = copy;
    });
    Object.keys(myPictures).forEach(function (k) {
      var pic = myPictures[k];
      if (!pic || !pic.dataUri) return;
      mergedWords[k] = Object.assign({}, mergedWords[k] || {}, { customPicture: { dataUri: pic.dataUri, credit: pic.credit } });
    });
    return { v: 1, words: mergedWords, senses: edits.senses };
  }
  function migrateLegacyPictures() {
    if (!myWords || typeof myWords.available !== 'function' || typeof myWords.putMedia !== 'function') return;
    var legacyKeys = Object.keys(myPictures).filter(function (k) { return myPictures[k] && myPictures[k].legacy; });
    if (!legacyKeys.length) return;
    myWords.available().then(function (ok) {
      if (!ok) return;
      var migrated = false;
      return Promise.all(legacyKeys.map(function (k) {
        var pic = myPictures[k];
        return myWords.putMedia(k, { picture: { dataUri: pic.dataUri, credit: { own: true } } }).then(function () {
          if (myPictures[k]) delete myPictures[k].legacy;
          if (edits && edits.words && edits.words[k]) delete edits.words[k].customPicture;
          migrated = true;
        }, function () {});
      })).then(function () { if (migrated) keepEdits(); });
    });
  }
  function clipUriFromEntry(entry) {
    if (!isObject(entry)) return '';
    var src = (isObject(entry.clip) && typeof entry.clip.dataUri === 'string' && entry.clip.dataUri)
      ? entry.clip
      : (isObject(entry.recording) && typeof entry.recording.dataUri === 'string' && entry.recording.dataUri ? entry.recording : null);
    if (!src || src.none) return '';
    var uri = String(src.dataUri || '').trim();
    return ANY_AUDIO_RE.test(uri) ? uri : '';
  }
  function readMyMedia(keys) {
    if (!myWords || !Array.isArray(keys) || !keys.length) return Promise.resolve({});
    var fn = typeof myWords.getManyMedia === 'function' ? myWords.getManyMedia
      : (typeof myWords.getMany === 'function' ? myWords.getMany : null);
    if (!fn) return Promise.resolve({});
    try {
      return Promise.resolve(fn.call(myWords, keys)).then(function (found) {
        return isObject(found) ? found : {};
      }, function () { return {}; });
    } catch (_) { return Promise.resolve({}); }
  }
  function loadVocabAudioKit() {
    var ready = function (kit) {
      if (!kit || typeof kit.wavUriToMp3Uri !== 'function') return Promise.resolve(null);
      if (typeof kit.getMp3 !== 'function') return Promise.resolve(kit);
      var timer = null;
      var cap = new Promise(function (resolve) { timer = setTimeout(function () { resolve(false); }, 800); });
      return Promise.race([kit.getMp3().catch(function () { return false; }), cap]).then(function (ok) {
        if (timer != null) clearTimeout(timer);
        return ok ? kit : (window.lamejs && window.lamejs.Mp3Encoder ? kit : null);
      });
    };
    if (window.AlloPacketAudioKit && typeof window.AlloPacketAudioKit.wavUriToMp3Uri === 'function') {
      return ready(window.AlloPacketAudioKit);
    }
    if (vocabAudioKitWait) return vocabAudioKitWait;
    if (!doc || !doc.createElement) return Promise.resolve(null);
    vocabAudioKitWait = new Promise(function (resolve) {
      var settled = false;
      var finish = function () {
        if (settled) return;
        settled = true;
        ready(window.AlloPacketAudioKit).then(resolve, function () { resolve(null); });
      };
      var existing = doc.querySelector && doc.querySelector('script[data-allo-audio-kit="1"]');
      if (existing) {
        setTimeout(finish, 400);
        return;
      }
      try {
        var sc = doc.createElement('script');
        sc.src = 'packets_audio_kit.js';
        sc.async = true;
        sc.setAttribute('data-allo-audio-kit', '1');
        sc.onload = finish;
        sc.onerror = finish;
        (doc.head || doc.documentElement).appendChild(sc);
        setTimeout(finish, 800);
      } catch (_) { finish(); }
    });
    return vocabAudioKitWait;
  }
  function prepareOneMyClip(rawUri) {
    if (!rawUri || !ANY_AUDIO_RE.test(rawUri)) return Promise.resolve('');
    if (Object.prototype.hasOwnProperty.call(myClipPortable, rawUri)) return Promise.resolve(myClipPortable[rawUri]);
    if (READY_AUDIO_RE.test(rawUri) && !WAV_AUDIO_RE.test(rawUri)) {
      var direct = rawUri.length <= MAX_CLIP_CHARS ? rawUri : '';
      myClipPortable[rawUri] = direct;
      return Promise.resolve(direct);
    }
    var encodeWav = function (wavUri) {
      if (!wavUri || !WAV_AUDIO_RE.test(wavUri)) return Promise.resolve('');
      return loadVocabAudioKit().then(function (kit) {
        if (kit && typeof kit.wavUriToMp3Uri === 'function') {
          try {
            var mp3 = kit.wavUriToMp3Uri(wavUri, 48);
            if (typeof mp3 === 'string' && READY_AUDIO_RE.test(mp3) && mp3.length <= MAX_CLIP_CHARS) {
              myClipPortable[rawUri] = mp3;
              return mp3;
            }
          } catch (_) {}
        }
        var ok = wavUri.length <= MAX_CLIP_CHARS ? wavUri : '';
        myClipPortable[rawUri] = ok;
        return ok;
      });
    };
    if (WAV_AUDIO_RE.test(rawUri)) return encodeWav(rawUri);
    var OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (loader && typeof loader.portableAudio === 'function' && OfflineCtx) {
      var todo = { audio: { clip: rawUri } };
      return Promise.resolve().then(function () {
        return loader.portableAudio(todo, { AudioContext: function () { return new OfflineCtx(1, 1, 22050); } });
      }).then(function () {
        var converted = todo.audio.clip;
        if (typeof converted === 'string' && WAV_AUDIO_RE.test(converted)) return encodeWav(converted);
        if (typeof converted === 'string' && READY_AUDIO_RE.test(converted) && converted.length <= MAX_CLIP_CHARS) {
          myClipPortable[rawUri] = converted;
          return converted;
        }
        return '';
      }, function () { return ''; });
    }
    return Promise.resolve('');
  }
  function loadMyClipsFor(words) {
    if (!myWords || !Array.isArray(words) || !words.length) return Promise.resolve({});
    var keys = [];
    words.forEach(function (w) {
      var k = builder.keyOf(w);
      if (k && keys.indexOf(k) < 0) keys.push(k);
    });
    if (!keys.length) return Promise.resolve({});
    return readMyMedia(keys).then(function (found) {
      var pairs = [];
      keys.forEach(function (k) {
        var mk = typeof myWords.normalizeMediaKey === 'function' ? myWords.normalizeMediaKey(k) : k;
        var entry = found[mk] || found[k] || null;
        var uri = clipUriFromEntry(entry);
        if (uri) pairs.push([k, uri]);
      });
      if (!pairs.length) return {};
      var out = Object.create(null);
      return Promise.all(pairs.map(function (pair) {
        return prepareOneMyClip(pair[1]).then(function (ready) {
          if (ready) out[pair[0]] = ready;
        });
      })).then(function () { return out; });
    });
  }
  function syncMyPictures() {
    if (!myWords) return Promise.resolve();
    var words = listNow().words;
    var keys = words.map(function (w) { return builder.keyOf(w); }).filter(Boolean);
    if (!keys.length) return Promise.resolve();
    var run = ++myPicSyncRun;
    return readMyMedia(keys).then(function (found) {
      if (run !== myPicSyncRun || !isObject(found)) return;
      var changedPic = false, changedClip = false;
      keys.forEach(function (k) {
        var mk = typeof myWords.normalizeMediaKey === 'function' ? myWords.normalizeMediaKey(k) : k;
        var entry = found[mk] || found[k] || null;
        var hasPic = !!(entry && entry.picture && !entry.picture.none && typeof entry.picture.dataUri === 'string' && entry.picture.dataUri);
        if (hasPic) {
          if (!myPictures[k] || myPictures[k].dataUri !== entry.picture.dataUri) {
            myPictures[k] = { dataUri: entry.picture.dataUri, credit: entry.picture.credit || { own: true }, stored: true };
            changedPic = true;
          }
        } else if (myPictures[k] && myPictures[k].stored) {
          delete myPictures[k];
          changedPic = true;
        }
        var clipUri = clipUriFromEntry(entry);
        if (clipUri) {
          if (myClips[k] !== clipUri) { myClips[k] = clipUri; changedClip = true; }
        } else if (myClips[k]) {
          delete myClips[k];
          changedClip = true;
        }
      });
      if (changedPic) redraft();
      if ((changedPic || changedClip) && step === 3) { drawStep3(); makeSoon(30); }
    }, function () {});
  }

  // ---------------------------------------------------------------------------
  // The rows: one for each word, made again after every change
  // ---------------------------------------------------------------------------
  function listNow() { return builder.parseWords(state.words); }
  function redraft() { rows = builder.draftRows({ words: listNow().words, bank: bankState === 'ready' ? bank : null, edits: effectiveEdits(), pictures: symbols, readingSymbolsExt: extSymbols, semantic: semantic, diagrams: !!state.diagrams, matcher: matcher, art: art }); }
  function rowOf(key) { return rows.filter(function (r) { return r.key === key; })[0] || null; }
  function changed() {
    keepEdits();
    redraft();
    clearBuilt();
    if (step === 2) drawRows();
    if (step === 3) { drawStep3(); makeSoon(250); }
  }

  // ---------------------------------------------------------------------------
  // Step 1: the words
  // ---------------------------------------------------------------------------
  function drawWords() {
    clearTimeout(wordsTimer);
    var list = listNow(), host = $('words-list');
    redraft();
    host.textContent = '';
    rows.forEach(function (row) {
      var item = el('li', row.inBank ? 'is-ok' : '');
      item.appendChild(el('span', 'w', row.word));
      var line = bankState === 'loading' ? 'Looking it up.' : row.inBank
        ? (row.base ? 'Found as a form of ' + row.base + ': ' : 'Found: ') + (row.senses.length === 1 ? '1 meaning.' : row.senses.length + ' meanings. The usual school meaning is used first.')
        : row.asName ? 'Taken as a name, so no meaning was looked up. ' + (row.def ? 'You typed a meaning for it.' : 'You can type what it means in step 2.') + ' For the meaning of ' + row.asName + ', type ' + row.word.toLowerCase() + ' without the capital letter.'
        : row.def ? 'Not in the word list. You typed a meaning for it.' : 'Not in the word list. You can type what it means in step 2.';
      item.appendChild(el('span', 's', line));
      host.appendChild(item);
    });
    list.unusable.forEach(function (text) {
      var item = el('li', 'is-out');
      item.appendChild(el('span', 'w', text));
      item.appendChild(el('span', 's', 'Not used: a word needs letters, and at most 40 characters.'));
      host.appendChild(item);
    });
    var found = rows.filter(function (r) { return r.inBank; }).length;
    var parts = [];
    if (!rows.length) parts.push('Type or paste your words above.');
    else parts.push(bankState === 'loading' ? count(rows.length, 'word') + '.' : found + ' of ' + count(rows.length, 'word') + ' found in the word list.');
    if (list.twice.length) parts.push('Listed more than once, used once: ' + list.twice.join(', ') + '.');
    if (list.over) parts.push('Not used: ' + count(list.over, 'more word') + '. A file holds ' + builder.MAX_WORDS + ' words at most.');
    setText('words-line', parts.join(' '));
  }
  function stopAtStep1() {
    if (!rows.length) return 'Type at least one word to go on.';
    if (bankState === 'loading') return 'The word list is still loading. Wait a moment, then press Next again.';
    if (rows.length < 4) return 'A question has 4 answers to choose from, so the list needs at least 4 words. Add ' + (4 - rows.length) + ' more.';
    return '';
  }

  // ---------------------------------------------------------------------------
  // Step 2: check the questions
  // ---------------------------------------------------------------------------
  function editBox(row, what, i, values, labels, onSave) {
    var box = el('div', 'v-edit');
    var fields = values.map(function (value, k) {
      var id = 'edit-' + row.key.replace(/[^a-z0-9]+/gi, '-') + '-' + what + '-' + i + '-' + k;
      var label = el('label', '', labels[k]);
      label.htmlFor = id;
      var field = el(k === values.length - 1 ? 'textarea' : 'input', '');
      if (field.tagName === 'INPUT') field.type = 'text';
      field.id = id;
      field.value = value || '';
      field.maxLength = k === values.length - 1 ? 300 : 60;
      add(box, label, field);
      return field;
    });
    var row2 = el('div', 'row');
    add(row2, button('Save', 'btn-small btn-primary', function () { onSave(fields.map(function (f) { return f.value; })); }),
      button('Cancel', 'btn-small', function () { editing = null; focusAfter = '[data-edit="' + row.key + '|' + what + '|' + i + '"]'; drawRowsHere(); }));
    box.appendChild(row2);
    focusAfter = focusAfter || '#' + fields[0].id;
    return box;
  }
  function isEditing(row, what, i) { return !!editing && editing.key === row.key && editing.what === what && editing.i === i; }
  function openEdit(row, what, i) { editing = { key: row.key, what: what, i: i }; focusAfter = ''; drawRowsHere(); }
  function drawRowsHere() { if (step === 2) drawRows(); else if (step === 3) drawBlankRows(); }
  function editButton(row, what, i, label) {
    var b = button('Edit', 'btn-small', function () { openEdit(row, what, i); }, label);
    b.setAttribute('data-edit', row.key + '|' + what + '|' + i);
    return b;
  }
  function saveRight(row, value) {
    var text = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (row.own) { var w = wordEdit(row.key); if (text) w.def = text; else delete w.def; }
    else if (text && text !== String(row.sense.def || '').trim()) senseEdit(row.senseId).def = text;
    else if (edits.senses[row.senseId]) delete edits.senses[row.senseId].def;
    editing = null;
    focusAfter = '[data-edit="' + row.key + '|def|0"]';
    changed(row.key);
  }
  function saveExample(row, value) {
    var text = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (row.own) { var w = wordEdit(row.key); if (text) w.example = text; else delete w.example; }
    else if (text !== String(row.sense.example || '').trim()) senseEdit(row.senseId).example = text;
    else if (edits.senses[row.senseId]) delete edits.senses[row.senseId].example;
    editing = null;
    focusAfter = '[data-edit="' + row.key + '|example|0"]';
    changed(row.key);
  }
  function setWrong(row, list) {
    var w = wordEdit(row.key);
    w.wrong = list.map(function (c) { return { id: c.id || '', word: c.word, def: c.def, from: c.from || 'bank' }; });
    w.wrongFor = row.senseId;
  }
  function drawRow(row) {
    var box = el('div', 'v-row');
    box.setAttribute('data-row', row.key);
    var open = !!changing[row.key] || (!!editing && editing.key === row.key) || (row.own && !row.def);
    box.classList.toggle('is-changing', open);
    var head = el('div', 'v-head');
    var change = button('Change', 'btn-small v-change', function () {
      if (changing[row.key]) delete changing[row.key]; else changing[row.key] = true;
      var on = !!changing[row.key];
      box.classList.toggle('is-changing', on);
      change.setAttribute('aria-expanded', on ? 'true' : 'false');
    }, 'Change the answers for ' + row.word);
    change.setAttribute('aria-expanded', open ? 'true' : 'false');
    add(head, el('h3', '', row.word), row.pos ? el('span', 'v-pos', row.pos) : null,
      row.own ? el('span', 'v-mark v-mark-not', row.net ? (row.net.changed ? 'from the internet, changed by you' : 'from the internet, not checked') : 'not in the word list') : row.checked ? el('span', 'v-mark', 'AI-checked') : el('span', 'v-mark v-mark-not', 'not checked'),
      row.edited && !row.own ? el('span', 'v-pos', 'you changed it') : null, change);
    box.appendChild(head);
    // "cats" is looked up as "cat": the meaning is for that word, and the student sees the word as typed. 2026-11-13.
    // 2026-11-13: in Meaning to word the wrong words are written the same way ("dogs"), or, when they cannot all be, the
    // question asks for the word the meaning is for (builder.wordQuestion).
    if (row.base) {
      var asked = row.wordAsk || {};
      box.appendChild(el('p', 'v-out', 'The meaning is for ' + row.base + '. Students see ' + row.word + ' as you typed it'
        + (asked.base ? ', except in Meaning to word: there the answer is ' + asked.answer + ', because its wrong words cannot all be written like ' + row.word : '')
        + '. To ask about ' + row.base + ', type ' + row.base + ' in step 1.'
        + (asked.form && asked.wrong && asked.wrong.length ? ' In Meaning to word the wrong words are written the same way: ' + listed(asked.wrong) + '.' : '')));
    }
    // The right answer.
    var right = el('div', 'v-line v-right');
    if (isEditing(row, 'def', 0) || (row.own && !row.def)) {
      if (row.own && !row.def) box.appendChild(el('p', 'v-out', 'This word is not in the word list. Type what it means, in words a student knows.'));
      right.appendChild(editBox(row, 'def', 0, [row.def], ['What ' + row.word + ' means'], function (v) { saveRight(row, v[0]); }));
    } else {
      var p = el('p', 'v-text');
      add(p, el('span', 'v-tag', 'Right answer '), doc.createElement('br'), doc.createTextNode(row.def));
      add(right, p, add(el('div', 'v-tools'), editButton(row, 'def', 0, 'Edit the right answer for ' + row.word)));
    }
    box.appendChild(right);
    // A word the word list does not have: its meaning can be looked up online, on a page of its own (the only one that may).
    if (row.own) {
      // "again" only after a lookup: a meaning the teacher typed was not looked up (2026-11-13, teacher-journey pass).
      var look = el('a', 'btn btn-small', row.net ? 'Look it up online again' : 'Look it up online');
      var otherMissing = rows.filter(function (r) { return r.own && !r.def && r.key !== row.key; }).map(function (r) { return r.word; });
      look.href = LOOKUP_PAGE + '#word=' + encodeURIComponent(row.word) + (otherMissing.length ? '&more=' + encodeURIComponent(otherMissing.join(',')) : '');
      look.setAttribute('data-lookup', row.key);
      box.appendChild(add(el('p', 'v-own'), look, el('span', 'hint', ' Opens a page that sends only this word to a free online dictionary, after you allow it.')));
    }
    // The word's other meanings: the school meaning first. The teacher never has to choose one.
    if (row.senses.length > 1) {
      var more = el('details', 'v-meanings');
      if (openMenus[row.key] || (editing && editing.key === row.key && editing.what === 'sense')) more.open = true;
      more.addEventListener('toggle', function () { if (more.open) openMenus[row.key] = true; else delete openMenus[row.key]; });
      more.appendChild(el('summary', '', 'Change meaning (' + row.senses.length + ' meanings)'));
      var group = el('div', 'radios radios-stack');
      group.setAttribute('role', 'radiogroup');
      group.setAttribute('aria-label', 'Meaning of ' + row.word);
      row.senses.forEach(function (s, k) {
        var label = el('label', 'radio'), radio = el('input');
        radio.type = 'radio';
        radio.name = 'sense-' + row.key;
        radio.value = s.id;
        radio.checked = s.id === row.senseId;
        radio.addEventListener('change', function () {
          if (!radio.checked) return;
          wordEdit(row.key).sense = s.id;
          editing = { key: row.key, what: 'sense', i: 0 };
          focusAfter = 'input[name="sense-' + row.key + '"][value="' + s.id.replace(/"/g, '') + '"]';
          changed(row.key);
        });
        var words = el('span', '');
        words.appendChild(doc.createTextNode((s.pos ? s.pos + ': ' : '') + s.def));
        if (k === 0) words.appendChild(el('span', 'radio-sub', 'The usual school meaning.' + (s.checked ? ' ' + 'AI-checked' + '.' : '')));
        else if (s.checked) words.appendChild(el('span', 'radio-sub', 'AI-checked' + '.'));
        add(label, radio, words);
        label.classList.toggle('is-on', radio.checked);
        group.appendChild(label);
      });
      more.appendChild(group);
      box.appendChild(more);
    }
    // The 3 wrong answers.
    if (row.def) {
      var list = el('ul', 'v-wrong');
      list.setAttribute('aria-label', 'Wrong answers for ' + row.word);
      row.wrong.forEach(function (c, i) {
        var item = el('li', 'v-line');
        if (isEditing(row, 'wrong', i)) {
          item.appendChild(editBox(row, 'wrong', i, [c.word, c.def], ['Wrong answer ' + (i + 1) + ': the word', 'Its meaning'], function (v) {
            var next = row.wrong.slice();
            var word = String(v[0] || '').replace(/\s+/g, ' ').trim().slice(0, 60), def = String(v[1] || '').replace(/\s+/g, ' ').trim().slice(0, 300);
            if (!word || !def) { focusAfter = ''; return; }
            next[i] = { id: '', word: word, def: def, from: 'teacher' };
            setWrong(row, next);
            editing = null;
            focusAfter = '[data-edit="' + row.key + '|wrong|' + i + '"]';
            changed(row.key);
          }));
        } else {
          var text = el('p', 'v-text');
          add(text, el('span', 'v-word', c.word), doc.createTextNode(c.def));
          var tools = el('div', 'v-tools');
          var swap = button('Swap', 'btn-small', function () {
            var next = builder.swap(row, i);
            if (!next) return;
            var list2 = row.wrong.slice(); list2[i] = next;
            setWrong(row, list2);
            focusAfter = '[data-swap="' + row.key + '|' + i + '"]';
            changed(row.key);
          }, 'Swap wrong answer ' + (i + 1) + ' for ' + row.word);
          swap.setAttribute('data-swap', row.key + '|' + i);
          if (row.pool.length <= row.wrong.length) swap.disabled = true;
          add(tools, swap, editButton(row, 'wrong', i, 'Edit wrong answer ' + (i + 1) + ' for ' + row.word));
          add(item, text, tools);
        }
        if (row.problems[i]) item.appendChild(el('p', 'v-warn', row.problems[i]));
        list.appendChild(item);
      });
      box.appendChild(list);
      if (row.wrong.length < builder.WRONG) box.appendChild(el('p', 'v-warn', 'There are not enough wrong answers for this word. Add more words to your list: their meanings can be used.'));
    }
    var mine = edits.words[row.key], theirs = row.senseId && edits.senses[row.senseId];
    if ((mine && (mine.sense || mine.wrong || mine.def || mine.example || mine.blank)) || (theirs && (theirs.def || theirs.example != null))) {
      var undo = button('Undo my changes to ' + row.word, 'btn-small btn-text', function () {
        delete edits.words[row.key];
        if (row.senseId) delete edits.senses[row.senseId];
        focusAfter = '[data-row="' + row.key + '"] h3';
        changed(row.key);
      });
      box.appendChild(add(el('p', 'v-undo'), undo));
    }
    return box;
  }
  function rowPriority(r) {
    if (r.problems.some(Boolean) || !r.def || r.wrong.length < builder.WRONG) return 0;
    if ((!r.own && !r.checked) || (r.own && r.net && !r.net.changed)) return 1;
    return 2;
  }
  function drawRows() {
    var host = $('rows');
    host.textContent = '';
    // Float rows needing a look and unchecked meanings to the top ("Read these first"), preserving list order within each group.
    var ordered = rows.map(function (row, idx) { return { row: row, prio: rowPriority(row), idx: idx }; })
      .sort(function (a, b) { return a.prio - b.prio || a.idx - b.idx; });
    ordered.forEach(function (entry) { host.appendChild(drawRow(entry.row)); });
    var notYet = rows.filter(function (r) { return !r.own && !r.checked; }).length;
    var look = rows.filter(function (r) { return r.problems.some(Boolean) || !r.def || r.wrong.length < builder.WRONG; }).length;
    var parts = [capital(count(rows.length, 'word')) + '.'];
    if (notYet) parts.push(notYet + ' not checked yet.');
    if (look) parts.push(count(look, 'word needs', 'words need') + ' a look.');
    setText('rows-line', parts.join(' '));
    settleFocus();
  }
  function settleFocus() {
    if (!focusAfter) return;
    var target = null;
    try { target = doc.querySelector(focusAfter); } catch (_) { target = null; }
    focusAfter = '';
    if (target) { if (target.tagName === 'H3') target.tabIndex = -1; target.focus(); }
  }

  // ---------------------------------------------------------------------------
  // Step 3: what goes in the file, and the file
  // ---------------------------------------------------------------------------
  // Picture questions are offered when at least builder.MIN_PICTURES list words have a picture: with fewer, the
  // pictures to choose from would mostly be words the student has not met in this list.
  function hasCustomPictures() { return rows.some(function (r) { return !!(r && r.customPicture); }); }
  function picturesOffered() { return (!!symbols || !!state.diagrams || hasCustomPictures()) && typeof builder.pictureCount === 'function' && builder.pictureCount(rows).offered; }
  function typesNow() { return state.types.filter(function (id) { var t = builder.TYPES.filter(function (x) { return x.id === id; })[0]; return !!t && (!t.pictures || picturesOffered()); }); }
  function drawTypes() {
    var host = $('types');
    host.textContent = '';
    var pics = (symbols || state.diagrams || hasCustomPictures()) && typeof builder.pictureCount === 'function' ? builder.pictureCount(rows) : null;
    builder.TYPES.forEach(function (t) {
      if (t.pictures && !pics) return;
      var label = el('label', 'choice'), box = el('input');
      box.type = 'checkbox';
      box.value = t.id;
      box.checked = state.types.indexOf(t.id) >= 0;
      box.setAttribute('data-type', t.id);
      var closed = !!t.pictures && !pics.offered;
      if (closed) { box.disabled = true; box.checked = false; label.classList.add('is-off'); }
      box.addEventListener('change', function () {
        state.types = builder.TYPES.map(function (x) { return x.id; }).filter(function (id) { return id === t.id ? box.checked : state.types.indexOf(id) >= 0; });
        remember();
        label.classList.toggle('is-on', box.checked);
        syncMix();
        drawBlankRows();
        drawPictureRows();
        makeSoon(30);
      });
      var usable = rows.filter(function (r) { return !builder.rowStop(r, t.id); }).length;
      var note = t.id === 'blank' ? usable + ' of ' + count(rows.length, 'word') + ' have a sentence that works.'
        : !t.pictures ? usable + ' of ' + count(rows.length, 'word') + ' can be asked this way.'
        // 2026-11-13 (teacher-journey pass): "None of the 12 words" rather than "Only 0 of 12 words"; "1 word has".
        : closed ? (pics.withPicture ? 'Only ' + pics.withPicture + ' of ' + count(rows.length, 'word') + ' have a picture.' : 'None of the ' + rows.length + ' words has a picture.') + ' Picture questions need at least ' + pics.need + ', so that the other pictures are mostly words from your list.'
        : usable + ' of ' + count(rows.length, 'word') + ' can be asked this way. ' + capital(count(pics.withPicture, 'word')) + (pics.withPicture === 1 ? ' has' : ' have') + ' a picture.';
      add(label, box, el('span', 'choice-name', t.name), el('span', 'choice-line', t.line + (t.on ? '' : ' Off unless you choose it.') + (t.pictures ? ' Cannot be answered with a screen reader.' : '')),
        typeExampleText(t.id) ? el('span', 'choice-example', typeExampleText(t.id)) : null, el('span', 'choice-note', note));
      label.classList.toggle('is-on', box.checked);
      host.appendChild(label);
    });
  }
  function drawCustomPicRows() {
    var host = $('custom-pic-rows');
    if (!host) return;
    host.textContent = '';
    rows.forEach(function (row) {
      var box = el('div', 'v-row');
      box.setAttribute('data-custom-pic-row', row.key);
      var line = el('div', 'v-line');
      var status = row.customPicture ? 'Your picture is set.'
        : row.pictureSource === 'diagram' ? 'School concept diagram.'
        : row.picture ? 'Picture from the picture set.'
        : 'No picture yet.';
      var tools = el('div', 'v-tools');
      var chooseBtn = button(row.customPicture ? 'Change picture' : 'Choose a picture', 'btn-small', function () {
        pendingPicWord = row.key;
        var inp = $('f-custom-pic');
        if (inp) { inp.value = ''; inp.click(); }
      }, (row.customPicture ? 'Change picture for ' : 'Choose a picture for ') + row.word);
      chooseBtn.setAttribute('data-choose-pic', row.key);
      tools.appendChild(chooseBtn);
      var nw = myWords && typeof myWords.normalizeWord === 'function' ? myWords.normalizeWord(row.word) : '';
      if (nw) {
        var findLink = el('a', 'btn btn-small', 'Find a picture');
        findLink.href = PICTURES_PAGE + '#word=' + encodeURIComponent(nw) + '&from=vocab';
        findLink.target = '_blank';
        findLink.rel = 'noopener';
        findLink.setAttribute('data-find-pic', row.key);
        findLink.appendChild(el('span', 'sr-only', ' (opens in a new tab)'));
        tools.appendChild(findLink);
      }
      if (row.customPicture) {
        var rmBtn = button('Remove my picture', 'btn-small', function () {
          delete myPictures[row.key];
          if (edits.words[row.key]) delete edits.words[row.key].customPicture;
          if (myWords && typeof myWords.putMedia === 'function') myWords.putMedia(row.key, { picture: null }).catch(function () {});
          setText('custom-pic-said', 'Removed your picture for ' + row.word + '.');
          changed();
        }, 'Remove my picture for ' + row.word);
        rmBtn.setAttribute('data-remove-pic', row.key);
        tools.appendChild(rmBtn);
      }
      add(line, add(el('p', 'v-text'), el('span', 'v-word', row.word), doc.createTextNode(' — ' + status)), tools);
      box.appendChild(line);
      host.appendChild(box);
    });
    syncVocabMissingPicturesLink();
  }
  // The picture questions, to look at before the file is made: each word with its picture and the 3 others, and a box to
  // leave a word out (a picture can show another meaning of the word: a bat for baseball, not the animal).
  function drawPictureRows() {
    var on = typesNow().some(function (id) { return id === 'picture' || id === 'picword'; });
    show('picture-panel', on);
    var host = $('picture-rows');
    if (!host) return;
    host.textContent = '';
    if (!on) return;
    var needsSymbols = rows.some(function (r) { return r.picture && r.pictureSource === 'symbol'; });
    if (pictureState !== 'ready') {
      if (pictureState !== 'failed' && symbols && needsSymbols) {
        setText('picture-line', 'Getting the pictures' + (symbols.bytes > 0 ? ', about ' + fileSize(symbols.bytes) : '') + '. They come from this site, the same files whatever words you type.');
        getPictures();
        return;
      }
      if (pictureState === 'failed' && !state.diagrams && !hasCustomPictures()) {
        setText('picture-line', 'The pictures could not be downloaded. Check the connection, then load the page again.');
        getPictures();
        return;
      }
      setText('picture-line', pictureState === 'failed' && needsSymbols
        ? 'The everyday picture set could not be downloaded. Using school concept diagrams and your own pictures.'
        : '');
    } else {
      setText('picture-line', '');
    }
    var thumb = function (word, main) {
      var r = rowOf(builder.keyOf(word));
      var src = '';
      if (r && r.customPicture) {
        src = r.customPicture;
      } else {
        var got = null;
        if (pictureState === 'ready') {
          got = getSymbolEntry(word) || (r && r.pictureLookupWord ? getSymbolEntry(r.pictureLookupWord) : null);
        }
        if (got && typeof got.svg === 'string' && !(art && art.svgRefusal(got.svg))) {
          src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(got.svg)));
        } else {
          var dSvg = (r && r.diagramSvg) || '';
          if (!dSvg && state.diagrams && matcher && typeof matcher.getDiagram === 'function') {
            try {
              var dg = matcher.getDiagram(word, (r && r.base) || '', word);
              if (!dg && typeof matcher.matchWord === 'function') {
                var dm = matcher.matchWord({ word: word, lemma: (r && r.base) || '', definition: (r && r.def) || '' }, { symbols: symbols, readingSymbolsExt: extSymbols, semantic: semantic, preferDiagrams: true });
                if (dm && dm.svg) dg = dm;
              }
              if (dg && dg.svg) dSvg = dg.svg;
            } catch (_) { dSvg = ''; }
          }
          if (dSvg && !(art && art.svgRefusal(dSvg))) {
            src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(dSvg)));
          }
        }
      }
      var fig = el('figure', main ? 'v-pic v-pic-main' : 'v-pic');
      if (src) {
        var img = el('img');
        img.src = src;
        img.alt = '';
        img.width = 64; img.height = 64;
        fig.appendChild(img);
      }
      fig.appendChild(el('figcaption', '', word));
      return fig;
    };
    rows.forEach(function (row) {
      if (!row.picture && !row.pictureOff) return;
      var box = el('div', 'v-row');
      box.setAttribute('data-picture-row', row.key);
      box.appendChild(add(el('div', 'v-head'), el('h3', '', row.word)));
      if (row.picture) {
        var strip = el('div', 'v-pics');
        strip.appendChild(thumb(row.word, true));
        row.pictureWrong.forEach(function (c) { strip.appendChild(thumb(c.word, false)); });
        box.appendChild(strip);
        var why = builder.rowStop(row, 'picture');
        if (why) box.appendChild(el('p', 'v-out', 'Left out: ' + why.charAt(0).toLowerCase() + why.slice(1)));
      }
      var leave = el('label', 'radio'), omit = el('input');
      omit.type = 'checkbox';
      omit.checked = row.pictureOff;
      omit.setAttribute('data-no-picture', row.key);
      omit.addEventListener('change', function () {
        var w = wordEdit(row.key);
        if (omit.checked) w.noPicture = true; else delete w.noPicture;
        focusAfter = '[data-no-picture="' + row.key + '"]';
        changed(row.key);
      });
      add(leave, omit, el('span', '', 'Leave ' + row.word + ' out of the picture questions'));
      box.appendChild(leave);
      host.appendChild(box);
    });
    var none = rows.filter(function (r) { return !r.picture && !r.pictureOff; }).map(function (r) { return r.word; });
    if (none.length) host.appendChild(el('p', 'v-out', 'No picture in the picture set: ' + none.join(', ') + '.'));
    syncVocabMissingPicturesLink();
    settleFocus();
  }
  function loadExtSymbols() {
    if (!extSymbols) return Promise.resolve(false);
    if (typeof extSymbols.ready === 'function' && extSymbols.ready()) return Promise.resolve(true);
    if (media && typeof media.extPictures === 'function') {
      return media.extPictures(extSymbols).then(function (ok) { return !!ok; }, function () { return false; });
    }
    if (typeof extSymbols.load === 'function') {
      return extSymbols.load().then(function (ok) { return !!ok; }, function () { return false; });
    }
    return Promise.resolve(false);
  }
  function getPictures() {
    if (!media || !symbols || pictureState === 'loading' || pictureState === 'ready') return;
    pictureState = 'loading';
    Promise.all([media.pictures(symbols), loadExtSymbols()]).then(function (res) {
      pictureState = res[0] ? 'ready' : 'failed';
      if (pictureState === 'ready') redraft();
      if (step === 3) { drawStep3(); makeSoon(30); }
    }, function () {
      pictureState = 'failed';
      if (step === 3) { drawPictureRows(); makeSoon(30); }
    });
  }
  var blankLeftOpen = false;
  function drawBlankRows() {
    var on = state.types.indexOf('blank') >= 0;
    show('blank-panel', on);
    var host = $('blank-rows');
    host.textContent = '';
    if (!on) return;
    // Words that cannot be asked this way go in a fold under the others (2026-11-16): their reasons ("needs 3 other
    // verbs from your list") were mixed in with the sentences to check. The fold keeps Edit, so a sentence can be fixed.
    var left = rows.filter(function (row) { return !row.def || !!row.blank.why; });
    var fold = null, foldBody = null;
    if (left.length) {
      fold = el('details', 'why v-left');
      fold.id = 'blank-left';
      fold.open = blankLeftOpen || left.length === rows.length || left.some(function (row) { return isEditing(row, 'example', 0); });
      fold.appendChild(el('summary', '', left.length === rows.length ? 'None of your words can be asked this way yet. See why.'
        : capital(count(left.length, 'word')) + (left.length === 1 ? ' is' : ' are') + ' left out of Fill the blank. See why.'));
      fold.addEventListener('toggle', function () { blankLeftOpen = fold.open; });
      foldBody = fold.appendChild(el('div', 'v-rows'));
    }
    rows.forEach(function (row) {
      var box = el('div', 'v-row');
      box.setAttribute('data-blank-row', row.key);
      box.appendChild(add(el('div', 'v-head'), el('h3', '', row.word)));
      var line = el('div', 'v-line');
      if (isEditing(row, 'example', 0)) {
        line.appendChild(editBox(row, 'example', 0, [row.example], ['A sentence with the word ' + row.word + ' in it'], function (v) { saveExample(row, v[0]); }));
      } else {
        add(line, el('p', 'v-text', row.blank.ask || row.example || 'No sentence.'), add(el('div', 'v-tools'), editButton(row, 'example', 0, 'Edit the sentence for ' + row.word)));
      }
      box.appendChild(line);
      // The sentence has another form of the word ("predators"): that form is the answer, and the wrong words are written the same way. 2026-11-13.
      if (row.blank.ask && row.blank.answer && builder.keyOf(row.blank.answer) !== row.key) box.appendChild(el('p', 'v-out', 'The sentence has ' + row.blank.answer + ', so the answer is ' + row.blank.answer + (row.blank.why ? '.' : ', and the wrong words are written the same way.')));
      if (!row.def) box.appendChild(el('p', 'v-out', 'Left out: it has no meaning yet (step 2).'));
      else if (row.blank.why) box.appendChild(el('p', 'v-out', 'Left out: ' + row.blank.why.charAt(0).toLowerCase() + row.blank.why.slice(1)));
      else {
        var list = el('ul', 'v-wrong');
        list.setAttribute('aria-label', 'Wrong answers in the sentence for ' + row.word);
        row.blank.wrong.forEach(function (w, i) {
          var item = el('li', 'v-line');
          var swap = button('Swap', 'btn-small', function () {
            var next = builder.swap(row, i, 'blank');
            if (!next) return;
            var words = row.blank.wrong.slice(); words[i] = next;
            var e = wordEdit(row.key);
            e.blank = words; e.blankFor = row.senseId + '|' + row.blank.ask;
            focusAfter = '[data-blank-swap="' + row.key + '|' + i + '"]';
            changed(row.key);
          }, 'Swap wrong word ' + (i + 1) + ' for ' + row.word);
          swap.setAttribute('data-blank-swap', row.key + '|' + i);
          if (row.blank.pool.length <= builder.WRONG) swap.disabled = true;
          add(item, add(el('p', 'v-text'), el('span', 'v-word', w)), add(el('div', 'v-tools'), swap));
          if (row.blank.problems[i]) item.appendChild(el('p', 'v-warn', row.blank.problems[i]));
          list.appendChild(item);
        });
        box.appendChild(list);
      }
      (left.indexOf(row) >= 0 ? foldBody : host).appendChild(box);
    });
    if (fold) host.appendChild(fold);
    drawBlankKokoroCallout();
    settleFocus();
  }
  function drawMoreSummary() {
    var parts = [];
    if (!state.readAloud) parts.push('Read aloud: off');
    else parts.push(state.voices ? 'Read aloud + recordings' : 'Read aloud: device voice only');
    if (state.mode !== 'check' && state.repeatMissed) parts.push('repeat missed');
    setText('more-now', parts.join(' \u00b7 '));
  }
  function syncSymbolRunnerLink() {
    var srLink = $('open-symbol-runner');
    if (!srLink) return;
    var words = rows.map(function (r) { return String(r.word || '').trim(); })
      .filter(function (w) { return /^[A-Za-z0-9]{1,20}$/.test(w); }).slice(0, 30);
    if (words.length >= 2) {
      srLink.setAttribute('href', 'packets-symbol-runner.html#symbols=' + encodeURIComponent(words.join(',')));
      srLink.hidden = false;
    } else {
      srLink.setAttribute('href', 'packets-symbol-runner.html');
      srLink.hidden = true;
    }
  }
  function syncMix() {
    var mixable = state.mode !== 'check' && typesNow().length >= 2;
    show('v-mix-field', mixable);
    var box = $('v-mix');
    if (box) {
      box.checked = state.mix !== false;
      box.disabled = !mixable;
      box.parentNode.classList.toggle('is-on', box.checked);
    }
    show('v-mix-again', mixable && state.mix !== false);
    drawBatch();
  }
  function syncMode() {
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="mode"]'), function (radio) {
      radio.checked = radio.value === state.mode;
      radio.parentNode.classList.toggle('is-on', radio.checked);
    });
    show('code-panel', state.mode === 'check');
    // 2026-11-23: the page heading says which kind of file is being made ("Make a vocabulary check" opened a page
    // headed "Make vocabulary practice", and the choice itself is in step 3).
    var heading = doc.querySelector('main h1');
    if (heading) heading.textContent = state.mode === 'check' ? 'Make a vocabulary check' : 'Make vocabulary practice';
    if ($('f-repeat-missed')) $('f-repeat-missed').disabled = state.mode === 'check';
    syncMix();
    drawMoreSummary();
  }
  function drawStep3() {
    drawTypes();
    if ($('f-diagrams')) $('f-diagrams').checked = !!state.diagrams;
    drawCustomPicRows();
    drawBlankRows();
    drawPictureRows();
    syncMode();
    if ($('f-title').value !== state.title) $('f-title').value = state.title;
    $('f-read').checked = state.readAloud;
    if ($('f-repeat-missed')) { $('f-repeat-missed').checked = !!state.repeatMissed; $('f-repeat-missed').disabled = state.mode === 'check'; }
    if ($('f-voices')) { $('f-voices').checked = state.voices; $('f-voices').disabled = !state.readAloud; }
    drawMoreSummary();
    syncSymbolRunnerLink();
  }
  function clearBuilt() {
    buildRun++;
    built = null;
    if (fileUrl) { try { URL.revokeObjectURL(fileUrl); } catch (_) {} fileUrl = ''; }
    show('summary', false);
    show('size-warn', false);
    show('try', false);
    show('save', false);
    show('download-bundle', false);
    show('worksheet-audio', false);
    show('after-save', false);
    show('build-problem', false);
  }
  function making(text) { show('making', true); setText('making-line', text); }
  function problem(text) {
    show('making', false);
    setText('build-problem-text', text);
    show('build-problem', true);
    setText('making-said', text);
  }
  function makeSoon(delay) {
    clearTimeout(buildTimer);
    clearBuilt();
    making('Putting the file together.');
    buildTimer = setTimeout(make, delay);
  }
  function codeNow() { return String($('f-code').value || '').trim(); }
  function buildWith(learner, types, clips, overrideOrderSeed) {
    var sylTbl = (window.AlloModules && window.AlloModules.SyllableTableEn) || null;
    var useMix = state.mode !== 'check' && state.mix !== false && types.length >= 2;
    var orderMode = state.mode === 'check' ? undefined : (useMix ? 'mix' : 'blocks');
    var orderSeed = useMix
      ? (typeof overrideOrderSeed === 'number' && isFinite(overrideOrderSeed)
        ? Math.floor(overrideOrderSeed)
        : (typeof state.mixSeed === 'number' && isFinite(state.mixSeed) ? Math.floor(state.mixSeed) : null))
      : null;
    var vocabOpts = { loader: loader, rows: rows, types: types, mode: state.mode, title: state.title, readAloud: state.readAloud,
      voices: state.voices, clips: clips || null, pictures: pictureState === 'ready' ? symbols : null, readingSymbolsExt: pictureState === 'ready' ? extSymbols : null, semantic: semantic, diagrams: !!state.diagrams, matcher: matcher, art: art, syllables: sylTbl };
    if (meaningClipsNow) vocabOpts.meaningClips = meaningClipsNow;
    if (orderMode) vocabOpts.order = orderMode;
    if (orderSeed !== null) vocabOpts.orderSeed = orderSeed;
    if (Object.keys(previewOmit).length) vocabOpts.omitItems = previewOmit;
    var lesson = builder.lessonFromVocab(vocabOpts);
    var packetOpts = { lesson: lesson, loader: loader, rows: rows, bank: bankState === 'ready' ? bank : null, teacherCode: state.mode === 'check' ? codeNow() : '', learner: learner || '', voices: state.voices, diagrams: !!state.diagrams, repeatMissed: state.mode !== 'check' && !!state.repeatMissed };
    if (orderMode) packetOpts.order = orderMode;
    if (orderSeed !== null) packetOpts.orderSeed = orderSeed;
    return builder.buildVocabPacket(packetOpts);
  }
  function isPictureType(id) { return id === 'picture' || id === 'picword'; }
  function make() {
    clearTimeout(buildTimer);
    clearBuilt();
    var run = buildRun, types = typesNow(), notes = [];
    if (!types.length) { problem('Choose at least one kind of question.'); return Promise.resolve({ html: null, said: 'Choose at least one kind of question.' }); }
    var code = codeNow();
    if (state.mode === 'check' && code && code.length < 4) { show('making', false); setText('code-line', 'The teacher code needs 4 or more characters. Leave it empty for no code.'); return Promise.resolve({ html: null, said: 'The teacher code needs 4 or more characters.' }); }
    setText('code-line', '');
    // Picture questions wait for the pictures (getPictures makes the file again when they are here).
    if (types.some(isPictureType)) {
      var needsSymbols = rows.some(function (r) { return r.picture && r.pictureSource === 'symbol'; });
      var localReady = rows.filter(function (r) { return r.picture && (r.pictureSource === 'diagram' || r.pictureSource === 'own'); }).length >= (builder.MIN_PICTURES || 4);
      if (needsSymbols && pictureState !== 'ready' && pictureState !== 'failed') { making('Getting the pictures.'); getPictures(); return Promise.resolve({ html: null, said: 'Getting the pictures.' }); }
      if (pictureState === 'failed' && !localReady) { types = types.filter(function (id) { return !isPictureType(id); }); notes.push('The pictures could not be downloaded, so the file has no picture questions.'); }
      if (!types.length) { problem('The pictures could not be downloaded. Choose another kind of question, or load the page again.'); return Promise.resolve({ html: null, said: 'The pictures could not be downloaded.' }); }
    }
    var go = function (clips) {
      if (run !== buildRun) return { html: null, said: 'Cancelled.' };
      var result;
      try { result = buildWith('', types, clips); } catch (error) {
        var msg = 'The file could not be put together (' + (said(error) || 'no reason was given') + '). Your words and changes are still here.';
        problem(msg);
        return { html: null, said: msg };
      }
      drawResult(result, types, notes, clips);
      return built && built.html ? { html: built.html, url: fileUrl } : { html: null, said: 'Could not update the file.' };
    };
    // Recordings made ahead of time, for the words the file says out loud (Read aloud on, recordings not turned off).
    // Teacher recordings in My words are merged with priority over built-in recordings, and work even offline.
    if (!state.readAloud || !state.voices) { meaningClipsNow = null; meaningsMissingNow = []; blankMissingNow = []; drawBlankKokoroCallout(); return Promise.resolve(go(null)); }
    var wordsToHear = typeof builder.wordsToHear === 'function' ? builder.wordsToHear(rows, types) : rows.map(function (r) { return r.word; });
    var canMedia = !!(media && typeof loader.portableAudio === 'function');
    // Meanings recorded ahead of time (2026-11-23), where this site has them: each word's meaning, and with Word to
    // meaning its 3 wrong answers. A question gets them only when all its choices have one (packet_vocab_builder.js).
    // Those this site does not have may be in My words, made on the computer-voice page (packets_voice_meanings.js);
    // the rest are named under the file, with a link to make them there (meaningsMissingNow).
    var meaningsFor = function () {
      var texts = [], squeeze = function (t) { return String(t).replace(/\s+/g, ' ').trim(); };
      meaningsMissingNow = [];
      blankMissingNow = [];
      if (types.indexOf('meaning') >= 0 || types.indexOf('word') >= 0) {
        rows.forEach(function (r) {
          if (!r || !r.def) return;
          texts.push(squeeze(r.def));
          if (types.indexOf('meaning') >= 0) (r.wrong || []).forEach(function (c) { if (c && c.def) texts.push(squeeze(c.def)); });
        });
      }
      var blankTexts = types.indexOf('blank') >= 0 ? usableBlankSentences() : [];
      blankTexts.forEach(function (s) { texts.push(s); });
      texts = texts.filter(function (t, i) { return t && texts.indexOf(t) === i; });
      if (!texts.length) return Promise.resolve(null);
      var fromSite = media && typeof media.meaningClips === 'function'
        ? media.meaningClips(texts, function (text) { if (run === buildRun) making(text); }).then(null, function () { return {}; }) : Promise.resolve({});
      return fromSite.then(function (got) {
        var have = Object.assign(Object.create(null), isObject(got) ? got : {});
        var left = texts.filter(function (t) { return !have[t]; });
        var mine = left.length && myWords && typeof myWords.getMeaningClips === 'function' ? myWords.getMeaningClips(left).then(null, function () { return {}; }) : Promise.resolve({});
        return mine.then(function (found) {
          Object.keys(found || {}).forEach(function (t) { var c = found[t]; if (c && typeof c.dataUri === 'string') have[t] = c.dataUri; });
          meaningsMissingNow = texts.filter(function (t) { return !have[t]; });
          blankMissingNow = blankTexts.filter(function (s) { return !have[s]; });
          return Object.keys(have).length ? have : null;
        });
      }, function () { return null; });
    };
    making('Getting the recordings.');
    return meaningsFor().then(function (gotMeanings) {
      meaningClipsNow = gotMeanings;
      if (run !== buildRun) return { html: null, said: 'Cancelled.' };
      drawBlankKokoroCallout();
      if (!canMedia && !myWords) return go(null);
      return wordRecordings();
    });
    function wordRecordings() {
    return loadMyClipsFor(wordsToHear).then(function (ownClips) {
      if (run !== buildRun) return { html: null, said: 'Cancelled.' };
      var ownKeys = Object.keys(ownClips);
      var remaining = wordsToHear.filter(function (w) { return !ownClips[builder.keyOf(w)]; });
      if (!canMedia || !remaining.length) {
        return go(ownKeys.length ? ownClips : null);
      }
      return media.clips(remaining, loader, function (text) { if (run === buildRun) making(text); }).then(function (bankClips) {
        var merged = Object.create(null);
        if (isObject(bankClips)) Object.keys(bankClips).forEach(function (k) { merged[k] = bankClips[k]; });
        ownKeys.forEach(function (k) { merged[k] = ownClips[k]; });
        return go(Object.keys(merged).length ? merged : null);
      }, function () {
        notes.push(ownKeys.length
          ? 'The built-in recordings could not be downloaded, so the device voice reads the words without your own recording.'
          : 'The recordings could not be downloaded, so the device voice reads every word.');
        return go(ownKeys.length ? ownClips : null);
      });
    });
    }
  }
  function rowForPreviewItem(lesson, t, item) {
    var id = String((item && item.id) || '');
    var senseAt = id.lastIndexOf('@');
    if (senseAt >= 0) {
      var sid = id.slice(senseAt + 1);
      var bySense = rows.filter(function (r) { return r.senseId === sid; })[0];
      if (bySense) return bySense;
    }
    var byWord = item && item.word ? rowOf(builder.keyOf(String(item.word))) : null;
    if (byWord) return byWord;
    var stem = String((item && (item.ask || item.word)) || '');
    if (t && t.id === 'word') {
      var byDef = rows.filter(function (r) { return r.def && r.def.slice(0, 120) === stem.slice(0, 120); })[0];
      if (byDef) return byDef;
    }
    if (t && t.id === 'blank') {
      var byBlank = rows.filter(function (r) { return r.blank && r.blank.ask.slice(0, 120) === stem.slice(0, 120); })[0];
      if (byBlank) return byBlank;
    }
    if (t && t.id === 'picword' && item && item.image && lesson && lesson.images) {
      var imgUri = lesson.images[item.image] || item.image;
      var byImg = rows.filter(function (r) {
        try {
          if (r.customPicture && r.customPicture === imgUri) return true;
          if (r.diagramSvg && ('data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(r.diagramSvg)))) === imgUri) return true;
          if (pictureState === 'ready') {
            var s = getSymbolEntry(r.word) || (r.pictureLookupWord ? getSymbolEntry(r.pictureLookupWord) : null);
            return s && typeof s.svg === 'string' && ('data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(s.svg)))) === imgUri;
          }
          return false;
        } catch (_) { return false; }
      })[0];
      if (byImg) return byImg;
    }
    return null;
  }
  function describePreview(lesson) {
    var out = [], blocks = lesson && Array.isArray(lesson.blocks) ? lesson.blocks : [];
    blocks.forEach(function (block) {
      var t = builder.TYPES.filter(function (x) { return x.activity === block.activity; })[0] || null;
      (Array.isArray(block.items) ? block.items : []).forEach(function (item) {
        var row = item.practice ? null : rowForPreviewItem(lesson, t, item);
        var word = row ? row.word : String(item.word || '');
        var typeId = t ? t.id : '';
        out.push({
          itemId: String(item.id || ''),
          activity: String(block.activity || ''),
          typeId: typeId,
          rowKey: row ? row.key : (word ? builder.keyOf(word) : ''),
          word: word,
          sample: !!item.practice,
          label: (t ? t.name + ' — ' : '') + (word || String(item.id || '')),
          canSwap: !item.practice && !!row && (typeId === 'meaning' || typeId === 'word' || typeId === 'blank'),
          canTogglePicture: !item.practice && !!row && !!(t && t.pictures),
          noPicture: !!(row && edits.words[row.key] && edits.words[row.key].noPicture),
        });
      });
    });
    return out;
  }
  function onPreviewAction(req) {
    var act = req && req.action, item = req && req.item;
    if (!item || item.sample) return { said: 'Sample questions stay in checks.' };
    var key = String(item.rowKey || ''), row = key ? rowOf(key) : null;
    var rollback = null, saidAction = '';
    if (act === 'remove') {
      if (!key) return { said: 'This question could not be matched.' };
      var omitKey = String(item.activity || '') + '|' + key;
      if (!previewOmit[omitKey]) { previewOmit[omitKey] = true; rollback = function () { delete previewOmit[omitKey]; }; }
      saidAction = 'Removed from this file.';
    } else if (act === 'swap') {
      if (!row) return { said: 'This word could not be matched.' };
      var countSlots = builder.WRONG || 3;
      var slotKey = item.typeId + '|' + key;
      var startSlot = Number(previewSlot[slotKey]) || 0;
      var usedSlot = -1, next = null;
      for (var k = 0; k < countSlots; k++) {
        var trySlot = (startSlot + k) % countSlots;
        var candidate = builder.swap(row, trySlot, item.typeId === 'blank' ? 'blank' : undefined);
        if (candidate) { usedSlot = trySlot; next = candidate; break; }
      }
      if (!next) return { said: 'No other wrong answers available for this word.' };
      previewSlot[slotKey] = (usedSlot + 1) % countSlots;
      if (item.typeId === 'blank') {
        var e = wordEdit(key), prevBlank = e.blank ? e.blank.slice() : null, prevFor = e.blankFor;
        var words = row.blank.wrong.slice(); words[usedSlot] = next;
        e.blank = words; e.blankFor = row.senseId + '|' + row.blank.ask;
        rollback = function () { if (prevBlank) { e.blank = prevBlank; e.blankFor = prevFor; } else { delete e.blank; delete e.blankFor; } keepEdits(); redraft(); };
      } else {
        var we = wordEdit(key), prevWrong = we.wrong ? we.wrong.slice() : null, prevWFor = we.wrongFor;
        var list2 = row.wrong.slice(); list2[usedSlot] = next;
        setWrong(row, list2);
        rollback = function () { if (prevWrong) { we.wrong = prevWrong; we.wrongFor = prevWFor; } else { delete we.wrong; delete we.wrongFor; } keepEdits(); redraft(); };
      }
      keepEdits();
      redraft();
      saidAction = 'Changed wrong answers.';
    } else if (act === 'picture') {
      if (!key) return { said: 'This word could not be matched.' };
      var wp = wordEdit(key), wasOff = !!wp.noPicture;
      if (wasOff) delete wp.noPicture; else wp.noPicture = true;
      keepEdits();
      redraft();
      drawPictureRows();
      rollback = function () { if (wasOff) wp.noPicture = true; else delete wp.noPicture; keepEdits(); redraft(); drawPictureRows(); };
      saidAction = wasOff ? 'Picture included.' : 'Picture left out.';
    } else {
      return { said: 'Nothing changed.' };
    }
    inPreviewAction = true;
    return make().then(function (res) {
      inPreviewAction = false;
      if (!res || !res.html) {
        if (rollback) rollback();
        return make().then(function () { return { said: (res && res.said) || 'Could not update the file with that change.' }; });
      }
      return { html: res.html, url: res.url, said: saidAction };
    }, function (err) {
      inPreviewAction = false;
      if (rollback) rollback();
      return { said: String((err && err.message) || 'Could not update the file.') };
    });
  }
  function fileName(title, tail) {
    var safe = String(title || 'vocabulary').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'vocabulary';
    return safe + tail;
  }
  function drawSummaryRows() {
    if (!built || !built.summaryBase) return;
    var data = built.summaryBase.slice();
    if (built.codeName) data.push(['Code name', built.codeName]);
    data.push(['File', built.name + ', ' + fileSize(built.bytes) + '.']);
    var host = $('summary-rows');
    host.textContent = '';
    data.forEach(function (row) { host.appendChild(el('dt', '', row[0])); host.appendChild(el('dd', '', row[1])); });
  }
  function applySingleCodeName() {
    if (!built || !built.baseHtml) return;
    var single = activeSingleCode();
    state.codeName = single;
    var html = single ? builder.withCodeName(built.baseHtml, single) : built.baseHtml;
    var blob = new Blob([html], { type: 'text/html' });
    if (fileUrl) { try { URL.revokeObjectURL(fileUrl); } catch (_) {} fileUrl = ''; }
    built.html = html;
    built.codeName = single;
    built.name = fileName(built.lesson.title, (single ? '__' + single : '') + '.html');
    built.bytes = blob.size;
    try { fileUrl = URL.createObjectURL(blob); } catch (_) { fileUrl = ''; }
    drawSummaryRows();
    setText('summary-facts', capital(count(built.total, 'question')) + '. ' + (state.mode === 'check' ? 'A check.' : 'Practice.') + ' ' + fileSize(built.bytes) + '.');
    setText('size-warn', built.bytes >= LARGE_FILE_BYTES ? LARGE_FILE_SAID : '');
    show('size-warn', built.bytes >= LARGE_FILE_BYTES);
    if (fileUrl) {
      $('try').setAttribute('href', TRY_PAGE + '#' + fileUrl);
      show('try', true);
      var handoff = window.AlloPacketHandoff;
      if (!inPreviewAction && handoff && typeof handoff.hostPreview === 'function') {
        if (previewSession) previewSession.update({ url: fileUrl, html: built.html });
        else previewSession = handoff.hostPreview({ url: fileUrl, html: built.html, describe: describePreview, onAction: onPreviewAction });
      }
    }
  }
  function drawResult(result, types, notes, clipsUsed) {
    types = types || state.types;
    show('making', false);
    var lesson = result.lesson;
    var q = builder.questions(rows, types);
    // A check's sample question (2026-11-13) is not one of the questions: it is not scored.
    var scored = function (b) { return b.items.filter(function (it) { return !it.practice; }).length; };
    var samples = lesson.blocks.reduce(function (n, b) { return n + b.items.length - scored(b); }, 0);
    var total = lesson.blocks.reduce(function (n, b) { return n + scored(b); }, 0);
    var kinds = lesson.blocks.map(function (b) { var t = builder.TYPES.filter(function (x) { return x.activity === b.activity; })[0]; return scored(b) + ' ' + t.name; });
    var mixedOrderOn = Array.isArray(lesson.sequence) && lesson.sequence.length > 0;
    var data = [['Questions', capital(count(total, 'question')) + ': ' + listed(kinds) + '. Each has 4 answers to choose from, in a mixed order.'
      + (mixedOrderOn ? ' Question types are mixed, with Meaning to word before Word to meaning for each word.'
        : lesson.blocks.length > 1 && types.indexOf('meaning') >= 0 && types.indexOf('word') >= 0 ? ' Meaning to word comes first, so no meaning is shown as a choice before it is asked.' : '')]];
    var left = q.left.map(function (l) { var t = builder.TYPES.filter(function (x) { return x.id === l.type; })[0]; return l.word + ' (' + t.name + '): ' + l.why; });
    data.push(['Left out', left.length ? left.join(' ') : 'Nothing.']);
    data.push(['How', state.mode === 'check' ? 'A check: one try for each question, no right or wrong shown, no clock. The score is the number right.' + (codeNow() ? ' The answers screen opens with your teacher code.' : ' With no teacher code the screen at the end shows only the score.')
      : 'Practice: right or wrong after each answer, and a second try after a wrong one. No clock.']);
    // "practice question", as the math check page and the file itself ("Practice 1 of 1") call it (2026-11-13, teacher-journey pass).
    if (state.mode === 'check') data.push(['Practice first', samples ? count(samples, 'practice question') + ', with right or wrong shown, not scored. Its words are not in your list.' : 'None: every practice question shares a word with your list.']);
    // The recordings in the file: how many words, and what they add to its size.
    var clips = Object.keys(lesson.audio || {}), clipBytes = clips.reduce(function (n, id) { return n + String(lesson.audio[id]).length; }, 0);
    // Meaning recordings have ids that start with m (packet_vocab_builder.js meaningClipOf); word recordings with w.
    var meaningIds = clips.filter(function (id) { return id.charAt(0) === 'm'; }), wordIds = clips.filter(function (id) { return id.charAt(0) !== 'm'; });
    var heardWhat = [wordIds.length ? count(wordIds.length, 'word') : '', meaningIds.length ? count(meaningIds.length, 'meaning') : ''].filter(Boolean).join(' and ');
    var pictureIds = Object.keys(lesson.images || {}), pictureBytes = pictureIds.reduce(function (n, id) { return n + String(lesson.images[id]).length; }, 0);
    var missingMeanings = state.readAloud && state.voices && myWords && typeof myWords.getMeaningClips === 'function' ? meaningsMissingNow.slice(0, 120) : [];
    data.push(['Read aloud', (!state.readAloud ? 'Off.' : clips.length
      ? 'On. ' + capital(heardWhat) + ' have a recording made ahead of time (a machine voice), about ' + fileSize(clipBytes) + ' of the file. The device voice reads the rest, where the device has a voice that runs on it.'
      : 'On, where the device has a voice that runs on it.')
      + (missingMeanings.length ? ' ' + capital(count(missingMeanings.length, 'meaning')) + (missingMeanings.length === 1 ? ' has' : ' have') + ' no recording yet: More options has a link to make them with the computer voice.' : '')]);
    if (pictureIds.length) data.push(['Pictures', (!state.diagrams && !hasCustomPictures())
      ? capital(count(pictureIds.length, 'picture')) + ' from the Word Sounds picture set, about ' + fileSize(pictureBytes) + ' of the file. Their credits are under About this file.'
      : capital(count(pictureIds.length, 'picture')) + ', about ' + fileSize(pictureBytes) + ' of the file. Their credits are under About this file.']);
    if (notes && notes.length) data.push(['Note', notes.join(' ')]);
    setText('voices-line', !state.readAloud ? 'Read aloud is off, so the file has no recordings.' : !state.voices ? 'Off: the device voice reads every word.'
      : clips.length ? capital(heardWhat) + ' in this file have a recording, about ' + fileSize(clipBytes) + '.' : 'No word in this file has a recording made ahead of time.');
    var vLine = $('voices-line');
    if (vLine && vLine.parentNode) {
      var vWrap = $('voices-missing-wrap');
      var missingVoiceWords = [];
      if (state.readAloud && state.voices) {
        rows.forEach(function (r) {
          if (!r || !r.word || !r.key) return;
          if (clipsUsed && Object.prototype.hasOwnProperty.call(clipsUsed, r.key) && clipsUsed[r.key]) return;
          if (missingVoiceWords.indexOf(r.word) < 0 && missingVoiceWords.length < 24) missingVoiceWords.push(r.word);
        });
      }
      if (missingVoiceWords.length) {
        if (!vWrap) {
          vWrap = el('span', 'hint');
          vWrap.id = 'voices-missing-wrap';
          vLine.parentNode.insertBefore(vWrap, vLine.nextSibling);
        }
        vWrap.textContent = (missingVoiceWords.length === rows.length ? 'No recording yet for these words. ' : capital(count(missingVoiceWords.length, 'word')) + ' without a recording yet. ');
        var vLink = el('a', '', 'Record or make a voice clip');
        vLink.id = 'voices-add-link';
        vLink.href = VOICE_PAGE + '#words=' + encodeURIComponent(missingVoiceWords.join(','));
        vLink.target = '_blank';
        vLink.rel = 'noopener';
        vLink.appendChild(el('span', 'sr-only', ' (opens in a new tab)'));
        vWrap.appendChild(vLink);
        vWrap.hidden = false;
      } else if (vWrap) {
        vWrap.hidden = true;
        vWrap.textContent = '';
      }
      // 2026-11-23: meanings of this file with no recording (a teacher's own or changed meaning, a wrong answer written
      // here, or any meaning where this site has none): made on the computer-voice page, kept in My words, used here by
      // itself (myWords.onChange below makes the file again). A question plays meaning recordings only when all its
      // answers have one.
      var mWrap = $('meanings-missing-wrap');
      if (missingMeanings.length) {
        if (!mWrap) {
          mWrap = el('span', 'hint');
          mWrap.id = 'meanings-missing-wrap';
          (vWrap || vLine).parentNode.insertBefore(mWrap, (vWrap || vLine).nextSibling);
        }
        mWrap.textContent = capital(count(missingMeanings.length, 'meaning')) + (missingMeanings.length === 1 ? ' in this file has' : ' in this file have') + ' no recording yet. ';
        var mLink = el('a', '', 'Make them with the computer voice');
        mLink.id = 'meanings-add-link';
        mLink.href = voiceMeaningsHref(missingMeanings);
        mLink.target = '_blank';
        mLink.rel = 'noopener';
        mLink.appendChild(el('span', 'sr-only', ' (opens in a new tab)'));
        mWrap.appendChild(mLink);
        mWrap.hidden = false;
      } else if (mWrap) {
        mWrap.hidden = true;
        mWrap.textContent = '';
      }
    }
    data.push(['Title', lesson.title]);
    built = { baseHtml: result.html, html: result.html, name: fileName(lesson.title, '.html'), bytes: 0, lesson: lesson, total: total, summaryBase: data, codeName: '',
      coded: state.mode === 'check' && codeNow().length >= 4, types: types.slice(), clips: clipsUsed || null };
    applySingleCodeName();
    // The list of what is in the file sits under the choices (2026-11-16), so questions left out are said here too, by the Save button.
    setText('left-note-text', left.length ? capital(count(left.length, 'question')) + (left.length === 1 ? ' was' : ' were') + ' left out.' : '');
    show('left-note', left.length > 0);
    var sumBox = $('summary');
    var pNote = $('preview-note');
    var omitCount = activePreviewOmits().length;
    if (omitCount > 0 && sumBox) {
      if (!pNote) {
        pNote = el('p', 'note');
        pNote.id = 'preview-note';
        sumBox.appendChild(pNote);
      }
      pNote.textContent = capital(count(omitCount, 'question')) + ' removed in Preview. ';
      var restore = el('button', 'btn btn-text btn-small', 'Restore');
      restore.type = 'button';
      restore.id = 'preview-restore';
      restore.addEventListener('click', function () { resetPreview(false); make(); });
      pNote.appendChild(restore);
      pNote.hidden = false;
    } else if (pNote) {
      pNote.hidden = true;
      pNote.textContent = '';
    }
    show('summary', true);
    show('save', true);
    show('download-bundle', !!(window.AlloPacketZip && typeof window.AlloPacketZip.create === 'function' && window.AlloPacketPrintCards && typeof window.AlloPacketPrintCards.buildVocabWorksheetHtml === 'function'));
    show('worksheet-audio', !!(clips.length && window.AlloPacketPrintCards && typeof window.AlloPacketPrintCards.openVocabAudio === 'function'));
    setText('making-said', 'The file is ready: ' + count(total, 'question') + ', ' + fileSize(built.bytes) + '.');
    drawBatch();
  }
  function download(url, name) {
    var link = doc.createElement('a');
    link.href = url;
    link.download = name;
    link.hidden = true;
    doc.body.appendChild(link);
    link.click();
    doc.body.removeChild(link);
  }
  function saveFile() {
    if (!built) return;
    var url = fileUrl;
    if (!url) { try { url = URL.createObjectURL(new Blob([built.html], { type: 'text/html' })); } catch (_) { url = ''; } }
    if (!url) return problem('This browser cannot save files from a page. Open this page in Chrome, Edge, Firefox or Safari.');
    download(url, built.name);
    show('after-code', !!built.coded);
    show('after-save', true);
    $('after-save').focus();
  }

  // Unified code-name / batch .zip fold: 1 line puts that code name in the single file above; 2-40 lines saves a .zip in 1 click.
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
  function canRotateBatch(n) {
    return n >= 2 && state.mode !== 'check' && state.mix !== false && typesNow().length >= 2;
  }
  function drawBatch() {
    var list = batchList(), n = list.names.length, parts = [];
    var btn = $('batch-make');
    var canRotate = canRotateBatch(n);
    show('batch-rotate-wrap', canRotate);
    if ($('f-batch-rotate') && $('f-batch-rotate').parentNode) {
      $('f-batch-rotate').parentNode.classList.toggle('is-on', canRotate && $('f-batch-rotate').checked);
    }
    if (n === 0) {
      parts.push('Leave empty so each student types a code name at the start.');
      if (btn) btn.hidden = true;
    } else if (n === 1) {
      parts.push('Using ' + list.names[0] + ' in the file above' + (built ? ' (' + built.name + ')' : '') + '. Add another line to save a .zip.');
      if (btn) btn.hidden = true;
    } else {
      parts.push(count(n, 'file') + (built ? ', about ' + fileSize(n * built.bytes) + ' in all.' : '. The size shows here once the file above is ready.'));
      if (canRotate && $('f-batch-rotate') && $('f-batch-rotate').checked) parts.push('Each student gets a different question order.');
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
    if (!built || !built.baseHtml) { setText('batch-problem', 'The file above is not ready yet.'); return; }
    if (!window.AlloPacketZip || typeof window.AlloPacketZip.create !== 'function') { setText('batch-problem', 'This page could not load the part that makes .zip files. Load the page again.'); return; }
    try {
      var zip = window.AlloPacketZip.create(), encoder = new TextEncoder();
      var rotate = canRotateBatch(list.names.length) && !!($('f-batch-rotate') && $('f-batch-rotate').checked);
      var baseSeed = typeof state.mixSeed === 'number' && isFinite(state.mixSeed) ? Math.floor(state.mixSeed) : 0;
      list.names.forEach(function (name, idx) {
        var html = rotate
          ? buildWith(name, built.types || typesNow(), built.clips || null, baseSeed + idx + 1).html
          : builder.withCodeName(built.baseHtml, name);
        zip.add(fileName(built.lesson.title, '__' + name + '.html'), encoder.encode(html));
      });
      var parts = zip.finish();
      var zipName = fileName(built.lesson.title, '__' + list.names.length + '-students.zip');
      var url = URL.createObjectURL(new Blob(parts, { type: 'application/zip' }));
      download(url, zipName);
      setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 60000);
      setText('batch-said', 'Saved ' + zipName + ' (' + fileSize(zip.bytes) + '). Each file\'s name ends with the student\'s code name. Send each student their own file.');
    } catch (error) {
      setText('batch-problem', 'The .zip file could not be made (' + said(error) + ').');
    }
  }
  function loadRosterFile(file) {
    setText('batch-problem', '');
    if (!file) return;
    if (file.size > MAX_ROSTER_BYTES) { setText('batch-problem', 'That text file is too large. Choose a plain .txt list of code names.'); return; }
    if (typeof FileReader !== 'function') { setText('batch-problem', 'This browser cannot read local files here.'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var input = $('f-batch-names');
      if (input) input.value = String(reader.result || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
      applySingleCodeName();
      drawBatch();
    };
    reader.onerror = function () { setText('batch-problem', 'This browser could not read that file.'); };
    reader.readAsText(file);
  }

  // ---------------------------------------------------------------------------
  // "Open a file I made"
  // ---------------------------------------------------------------------------
  var reopenPending = null;
  function reopenNote(line, notes, page) {
    setText('reopen-line', line);
    var list = $('reopen-list');
    list.textContent = '';
    (notes || []).forEach(function (text) { list.appendChild(el('li', '', text)); });
    var link = $('reopen-page');
    if (link) {
      if (page && page.href) { link.setAttribute('href', page.href); link.textContent = 'Open ' + page.name; }
      link.hidden = !(page && page.href);
    }
    show('reopen-note', true);
    $('reopen-note').focus();
  }
  function reopen(textOfFile, sourceName, rawBytes) {
    reopenPending = null;
    var verify = window.AlloPacketVerify;
    var reopenKit = window.AlloPacketReopen;
    var handoff = window.AlloPacketHandoff;
    var bytes = rawBytes || (typeof TextEncoder === 'function' ? new TextEncoder().encode(String(textOfFile || '')).buffer : null);
    var fileName = String(sourceName || 'the file').slice(0, 120);
    if (reopenKit && typeof reopenKit.readVocab === 'function') {
      if (bankState === 'loading') { reopenNote('The word list is still loading. Wait a moment, then open the file again.'); return; }
      var checked = reopenKit.readVocab(bytes || textOfFile, { verify: verify, builder: builder, codeName: builder.codeName });
      if (!checked.ok) {
        var pageHref = checked.page ? checked.page.href : '';
        if (pageHref && bytes) {
          reopenPending = {
            file: { name: fileName, bytes: bytes },
            href: pageHref,
            hash: pageHref === 'packets-results.html' ? ((handoff && handoff.RESULTS_HASH) || '#import-results') : ((handoff && handoff.HASH) || '#open-file'),
          };
        }
        reopenNote(checked.why || 'This is not a file made with this page. Choose the .html file you saved in step 3.', [], checked.page);
        return;
      }
      var back = checked.vocab;
    } else {
      var parts = verify && typeof verify.readParts === 'function' ? verify.readParts(textOfFile) : null;
      if (!parts) { reopenNote('This page could not read the file. Load the page again.'); return; }
      if (parts.kind === 'results') { reopenNote('This is a results file, not a file made here. Add up results reads it.'); return; }
      if (bankState === 'loading') { reopenNote('The word list is still loading. Wait a moment, then open the file again.'); return; }
      var back = builder.readBack(parts);
      if (!back.ok) { reopenNote(parts.ok ? 'This file was not made on this page. Open it on the page that made it.' : 'This is not a file made with this page. Choose the .html file you saved in step 3.'); return; }
    }
    resetPreview(true);
    state.words = back.words.join('\n');
    if (back.types.length) state.types = back.types;
    state.mode = back.mode;
    state.title = back.title;
    state.readAloud = back.readAloud;
    state.voices = back.voices !== false;
    state.diagrams = !!back.diagrams;
    state.repeatMissed = back.mode !== 'check' && !!back.repeatMissed;
    if (back.mode !== 'check' && back.types.length >= 2) {
      state.mix = back.order === 'mix';
      state.mixSeed = typeof back.orderSeed === 'number' && isFinite(back.orderSeed) ? Math.floor(back.orderSeed) : null;
    } else {
      state.mix = true;
      state.mixSeed = null;
    }
    var noPicSet = {};
    (back.noPicture || []).forEach(function (word) { noPicSet[builder.keyOf(word)] = true; });
    (back.words || []).forEach(function (word) {
      var key = builder.keyOf(word);
      if (noPicSet[key]) wordEdit(key).noPicture = true;
      else if (edits.words && edits.words[key] && edits.words[key].noPicture) delete edits.words[key].noPicture;
    });
    state.codeName = back.learner;
    if ($('f-batch-names')) $('f-batch-names').value = back.learner || '';
    Object.keys(back.senses).forEach(function (key) { if (!/^own:/.test(back.senses[key])) wordEdit(key).sense = back.senses[key]; });
    back.rows.forEach(function (r) {
      var key = builder.keyOf(r.word), w = wordEdit(key);
      var s = !r.own && bankState === 'ready' && bank ? bank.sense(r.sense) : null;
      if (r.own || !s) { w.def = r.def; if (r.example) w.example = r.example; if (r.pos) w.pos = r.pos; }
      else {
        if (r.def && r.def !== String(s.def || '').trim()) senseEdit(r.sense).def = r.def;
        if (r.example !== String(s.example || '').trim()) senseEdit(r.sense).example = r.example;
      }
      if (r.wrong.length === builder.WRONG) { w.wrong = r.wrong; w.wrongFor = r.own || !s ? 'own:' + key : r.sense; }
      if (r.blank.length === builder.WRONG) { w.blank = r.blank; w.blankFor = (r.own || !s ? 'own:' + key : r.sense) + '|' + builder.blankSentence(r.example, r.word, { bank: bankState === 'ready' ? bank : null, pos: r.pos }).ask; }
    });
    keepEdits();
    remember();
    $('f-words').value = state.words;
    syncMyPictures();
    var notes = [capital(count(back.words.length, 'word')) + ', ' + (back.mode === 'check' ? 'a check' : 'practice') + '.'];
    if (back.mode === 'check') notes.push('A check keeps its wrong answers sealed, so they come from your changes kept on this device, or from the word list.');
    if (back.teacherCode) notes.push('A teacher code cannot be read back from a file. Set it again in step 3.');
    if (back.learner) { notes.push('It was made for ' + back.learner + '. That code name is filled in at step 3.'); if ($('batch')) $('batch').open = true; }
    reopenNote('Opened ' + (back.title || 'the file') + '.', notes);
    goTo(1, true);
  }

  // ---------------------------------------------------------------------------
  // Moving between the steps
  // ---------------------------------------------------------------------------
  function goTo(wanted, quiet) {
    var target = wanted, stop = '';
    if (target >= 2) {
      drawWords();
      stop = stopAtStep1();
      if (stop) { target = 1; setText('step-1-problem', stop); }
    }
    if (target !== 3) { clearTimeout(buildTimer); stopPreviewSession(); clearBuilt(); show('making', false); }
    var stayed = target !== wanted && target === step;
    step = target;
    editing = null;
    [1, 2, 3].forEach(function (n) { show('step-' + n, n === step); });
    Array.prototype.forEach.call(doc.querySelectorAll('.step-tab'), function (tab) {
      var n = Number(tab.getAttribute('data-go'));
      if (n === step) tab.setAttribute('aria-current', 'step'); else tab.removeAttribute('aria-current');
      tab.classList.toggle('is-done', n < step);
    });
    var name = productName();
    doc.title = (name ? name + ': ' : '') + 'Make vocabulary practice, step ' + step + ' of 3';
    if (step === 1) { if ($('f-words').value !== state.words) $('f-words').value = state.words; drawWords(); }
    if (step === 2) { redraft(); drawRows(); setText('step-2-problem', ''); }
    if (step === 3) { redraft(); drawStep3(); syncMyPictures(); makeSoon(30); }
    if (!quiet && !stayed) {
      var heading = $('step-' + step + '-title');
      if (heading) { heading.focus(); if (typeof heading.scrollIntoView === 'function') heading.scrollIntoView({ block: 'start' }); }
    }
  }

  function drawCredits() {
    var host = $('credits');
    host.textContent = '';
    (bank && Array.isArray(bank.credits) ? bank.credits : []).forEach(function (c) {
      if (!isObject(c) || !c.set) return;
      var bare = function (a) { return String(a || '').replace(/^https?:\/\//i, ''); };
      host.appendChild(el('li', '', String(c.set) + (c.author ? ', by ' + c.author : '') + (c.license ? ', license ' + c.license : '') + (c.deed ? ' (' + bare(c.deed) + ')' : '') + (c.url ? '. Source: ' + bare(c.url) : '') + '.'));
    });
  }
  // A file handed over by "Change this file" on Open a practice file (packets-open.html, packets_handoff.js): taken
  // once and deleted, then opened as if chosen here, when the word list is no longer loading.
  var handed = null;
  var handedDraft = null;
  var pendingRehearseStep2 = false;
  function normalizeDraftImgUri(uri) {
    if (typeof uri !== 'string') return '';
    var s = uri.trim();
    if (!s || s.length > 1572864) return '';
    if (/^data:image\/svg\+xml(?:;charset=[^;,]+)?,/i.test(s) && !/;base64,/i.test(s)) {
      var comma = s.indexOf(',');
      var rawSvg = comma >= 0 ? s.slice(comma + 1) : '';
      try { rawSvg = decodeURIComponent(rawSvg); } catch (_) {}
      if (!rawSvg) return '';
      try {
        s = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(rawSvg)));
      } catch (_) { return ''; }
    }
    if (/^data:image\/(?:png|jpeg|jpg|svg\+xml);base64,/i.test(s)) {
      if (typeof builder.validCustomDataUri === 'function') return builder.validCustomDataUri(s, art) || '';
      return /^data:image\/(?:png|jpeg|svg\+xml);base64,[A-Za-z0-9+/]+=*$/i.test(s) ? s : '';
    }
    if (/^data:image\/(?:webp|gif);base64,[A-Za-z0-9+/]+=*$/i.test(s)) return s;
    return '';
  }
  function applyVocabDraft(draft) {
    if (!draft || draft.kind !== 'vocab' || !Array.isArray(draft.entries) || !draft.entries.length) {
      reopenNote('The draft is not here any more. Type your words below to start.');
      return;
    }
    var seen = Object.create(null);
    var cleanEntries = [];
    var maxWords = builder.MAX_WORDS || 40;
    draft.entries.forEach(function (entry) {
      if (!entry || typeof entry !== 'object' || cleanEntries.length >= maxWords) return;
      var rawWord = typeof entry.word === 'string' ? entry.word.trim() : '';
      var word = typeof builder.normalizeWord === 'function' ? builder.normalizeWord(rawWord) : rawWord;
      if (!word) return;
      var key = builder.keyOf(word);
      if (!key || seen[key]) return;
      seen[key] = true;
      cleanEntries.push({
        word: word,
        key: key,
        meaning: typeof entry.meaning === 'string' ? entry.meaning.replace(/\s+/g, ' ').trim().slice(0, 300) : '',
        example: typeof entry.example === 'string' ? entry.example.replace(/\s+/g, ' ').trim().slice(0, 300) : '',
        pos: typeof entry.pos === 'string' ? entry.pos.replace(/\s+/g, ' ').trim().slice(0, 20) : '',
        imgUri: normalizeDraftImgUri(entry.imgUri),
        alt: typeof entry.alt === 'string' ? entry.alt.replace(/\s+/g, ' ').trim().slice(0, 120) : '',
      });
    });
    if (!cleanEntries.length) {
      reopenNote('No usable words were found in that draft. Type your words below to start.');
      return;
    }
    resetPreview(true);
    state.words = cleanEntries.map(function (e) { return e.word; }).join('\n').slice(0, MAX_TYPED);
    if (typeof draft.title === 'string' && draft.title.trim()) {
      state.title = draft.title.trim().slice(0, 80);
      if ($('f-title')) $('f-title').value = state.title;
    }
    if ($('f-words')) $('f-words').value = state.words;
    redraft();
    cleanEntries.forEach(function (e) {
      var row = rowOf(e.key);
      if (e.meaning) {
        if (row && !row.own && row.senseId) senseEdit(row.senseId).def = e.meaning;
        else wordEdit(e.key).def = e.meaning;
      }
      if (e.example) {
        if (row && !row.own && row.senseId) senseEdit(row.senseId).example = e.example;
        else wordEdit(e.key).example = e.example;
      }
      if (e.pos && (!row || row.own)) wordEdit(e.key).pos = e.pos;
      if (e.imgUri) {
        var picCredit = { own: true };
        if (e.alt) picCredit.alt = e.alt;
        myPictures[e.key] = { dataUri: e.imgUri, credit: picCredit };
        if (edits.words[e.key]) delete edits.words[e.key].noPicture;
      }
    });
    keepEdits();
    remember();
    redraft();
    var readyCount = rows.filter(function (r) { return !!r.def; }).length;
    var targetStep = rows.length >= 4 ? (readyCount >= 4 ? 3 : 2) : 1;
    goTo(targetStep, true);
    var notes = [];
    if (rows.length < 4) notes.push('Add ' + count(4 - rows.length, 'more word') + ' so each question has 4 choices.');
    reopenNote('Loaded ' + count(rows.length, 'word') + ' from AlloFlow.', notes);
  }
  function openHandedDraft() {
    if (handedDraft === null || bankState === 'loading') return;
    var draft = handedDraft;
    handedDraft = null;
    applyVocabDraft(draft);
  }
  function openHanded() {
    if (handed === null || bankState === 'loading') return;
    var item = handed;
    handed = null;
    reopen(item.text, item.name, item.bytes);
  }
  function takeHanded() {
    var handoff = window.AlloPacketHandoff;
    if (!handoff) return;
    var draftHash = handoff.DRAFT_HASH || '#import-draft';
    if (typeof handoff.takeDraft === 'function' && window.location.hash === draftHash) {
      try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
      handoff.takeDraft().then(function (draft) {
        if (!draft || draft.kind !== 'vocab' || !Array.isArray(draft.entries) || !draft.entries.length) {
          reopenNote('The draft is not here any more. Type your words below to start.');
          return;
        }
        handedDraft = draft;
        openHandedDraft();
      }, function () { reopenNote('This browser could not hand the draft over. Type your words below to start.'); });
      return;
    }
    if (typeof handoff.take !== 'function' || window.location.hash !== handoff.HASH) return;
    try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
    handoff.take().then(function (file) {
      if (!file) { reopenNote('The file is not here any more. Choose it with Open a file I made.'); return; }
      handed = { text: new TextDecoder('utf-8').decode(file.bytes), name: file.name, bytes: file.bytes };
      openHanded();
    }, function () { reopenNote('This browser could not hand the file over. Choose it with Open a file I made.'); });
  }
  function startBank() {
    var given = window.AlloVocabBank;
    if (!given || typeof given.load !== 'function' || typeof given.senses !== 'function') {
      bankState = 'missing';
      setText('bank-line', 'The word list could not be loaded. You can still type the meaning of each word yourself in step 2.');
      openHanded();
      openHandedDraft();
      return;
    }
    bank = given;
    bankState = 'loading';
    setText('bank-line', 'Getting the word list' + (bank.bytes > 0 ? ', about ' + fileSize(bank.bytes) : '') + '. It comes from this site and stays on this device.');
    var done = function (ok) {
      bankState = ok ? 'ready' : 'failed';
      setText('bank-line', ok ? 'The word list is ready.' : 'The word list could not be loaded. Check the connection and load the page again, or type the meaning of each word yourself in step 2.');
      if (ok) drawCredits();
      if (step === 1) drawWords();
      if (step === 2) { redraft(); drawRows(); }
      if (pendingRehearseStep2) { pendingRehearseStep2 = false; goTo(2, true); }
      openHanded();
      openHandedDraft();
    };
    var started;
    try { started = bank.load(); } catch (_) { started = null; }
    if (!started || typeof started.then !== 'function') { done(false); return; }
    started.then(function () { done(true); }, function () { done(false); });
  }

  function wire() {
    Array.prototype.forEach.call(doc.querySelectorAll('.step-tab'), function (tab) {
      tab.addEventListener('click', function () { goTo(Number(tab.getAttribute('data-go'))); });
    });
    $('f-words').addEventListener('input', function () {
      state.words = this.value.slice(0, MAX_TYPED);
      remember();
      setText('step-1-problem', '');
      clearTimeout(wordsTimer);
      wordsTimer = setTimeout(drawWords, 250);
    });
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="mode"]'), function (radio) {
      radio.addEventListener('change', function () { if (!radio.checked) return; state.mode = radio.value; remember(); syncMode(); makeSoon(30); });
    });
    $('f-title').addEventListener('input', function () { state.title = this.value.slice(0, 80); remember(); makeSoon(400); });
    if ($('v-mix')) $('v-mix').addEventListener('change', function () {
      state.mix = this.checked;
      state.mixSeed = null;
      remember();
      syncMix();
      makeSoon(30);
    });
    if ($('v-mix-again')) $('v-mix-again').addEventListener('click', function () {
      state.mixSeed = (typeof state.mixSeed === 'number' && isFinite(state.mixSeed) ? Math.floor(state.mixSeed) : 0) + 1;
      remember();
      setText('v-mix-said', 'Mixed the questions again.');
      makeSoon(30);
    });
    if ($('f-starter')) {
      var starterApi = window.AlloPacketWordStarters;
      var starterList = starterApi && Array.isArray(starterApi.LIST) ? starterApi.LIST : [];
      if (starterList.length) {
        starterList.forEach(function (set) {
          if (!set || !set.id || !Array.isArray(set.words) || !set.words.length) return;
          var opt = el('option', '', set.title + ' (' + set.words.length + ' words)');
          opt.value = set.id;
          $('f-starter').appendChild(opt);
        });
        show('starter-row', true);
      }
      $('f-starter').addEventListener('change', function () {
        var val = this.value;
        this.value = '';
        if (!val || !starterApi || typeof starterApi.get !== 'function') return;
        var pickedSet = starterApi.get(val);
        if (!pickedSet || !Array.isArray(pickedSet.words) || !pickedSet.words.length) return;
        state.words = pickedSet.words.map(function (it) { return it.word; }).join('\n').slice(0, MAX_TYPED);
        if (!String(state.title || '').trim()) state.title = String(pickedSet.title || '').slice(0, 80);
        $('f-words').value = state.words;
        setText('step-1-problem', '');
        remember();
        drawWords();
      });
    }
    if ($('f-repeat-missed')) $('f-repeat-missed').addEventListener('change', function () { state.repeatMissed = this.checked; remember(); drawMoreSummary(); makeSoon(30); });
    $('f-read').addEventListener('change', function () { state.readAloud = this.checked; remember(); if ($('f-voices')) $('f-voices').disabled = !state.readAloud; drawMoreSummary(); makeSoon(30); });
    if ($('f-voices')) $('f-voices').addEventListener('change', function () { state.voices = this.checked; remember(); drawMoreSummary(); makeSoon(30); });
    if ($('f-diagrams')) $('f-diagrams').addEventListener('change', function () {
      state.diagrams = this.checked;
      remember();
      if (state.diagrams && pictureState === 'idle') getPictures();
      redraft();
      drawStep3();
      makeSoon(30);
    });
    if ($('f-custom-pic')) $('f-custom-pic').addEventListener('change', function () {
      var file = this.files && this.files[0];
      var targetKey = pendingPicWord;
      pendingPicWord = '';
      this.value = '';
      if (!file || !targetKey) return;
      var finish = function (safe) {
        if (!safe) {
          setText('custom-pic-said', 'Could not use that image. Choose a PNG, JPEG, GIF, WebP or SVG file.');
          return;
        }
        myPictures[targetKey] = { dataUri: safe, credit: { own: true } };
        if (edits.words[targetKey]) {
          delete edits.words[targetKey].customPicture;
          delete edits.words[targetKey].noPicture;
        }
        var row = rowOf(targetKey);
        var label = row ? row.word : targetKey;
        var persist = myWords && typeof myWords.putMedia === 'function'
          ? myWords.putMedia(targetKey, { picture: { dataUri: safe, credit: { own: true } } }).then(function () {
            if (myPictures[targetKey]) myPictures[targetKey].stored = true;
          }, function () {})
          : Promise.resolve();
        persist.then(function () {
          setText('custom-pic-said', 'Added picture for ' + label + '.');
          changed();
        });
      };
      var fallbackRead = function () {
        if (file.size > 300 * 1024) {
          setText('custom-pic-said', 'That picture is too large. Choose a smaller picture.');
          return;
        }
        if (typeof FileReader !== 'function') {
          setText('custom-pic-said', 'This browser cannot read local image files.');
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          var uri = String(reader.result || '');
          var safe = typeof builder.validCustomDataUri === 'function' ? builder.validCustomDataUri(uri, art) : (/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+=*$/i.test(uri) ? uri : '');
          finish(safe);
        };
        reader.onerror = function () { setText('custom-pic-said', 'This browser could not read that image.'); };
        reader.readAsDataURL(file);
      };
      if (myWords && typeof myWords.resizeToDataUri === 'function' && typeof file.slice === 'function') {
        myWords.resizeToDataUri(file).then(function (uri) {
          var safe = typeof builder.validCustomDataUri === 'function' ? builder.validCustomDataUri(uri, art) : uri;
          finish(safe);
        }, function (err) {
          if (err && (err.code === 'not_a_picture' || err.code === 'picture_too_big')) {
            setText('custom-pic-said', said(err) || 'Could not use that image.');
          } else {
            fallbackRead();
          }
        });
      } else {
        fallbackRead();
      }
    });
    // A meaning saved on the lookup page in another tab: read the changes again.
    window.addEventListener('storage', function (e) { if (e.key !== EDITS_KEY) return; edits = recallEdits(); redraft(); if (step === 1) drawWords(); if (step === 2) drawRows(); if (step === 3) { drawStep3(); makeSoon(30); } });
    $('f-code').addEventListener('input', function () { makeSoon(400); });
    if ($('code-show')) $('code-show').addEventListener('click', function () {
      var input = $('f-code'), shown = input.type === 'text';
      input.type = shown ? 'password' : 'text';
      this.setAttribute('aria-pressed', String(!shown));
      this.textContent = shown ? 'Show' : 'Hide';
      this.setAttribute('aria-label', shown ? 'Show the teacher code' : 'Hide the teacher code');
    });
    $('f-batch-names').addEventListener('input', function () { setText('batch-problem', ''); applySingleCodeName(); drawBatch(); });
    if ($('f-batch-rotate')) $('f-batch-rotate').addEventListener('change', drawBatch);
    $('batch-make').addEventListener('click', saveBatchZip);
    if ($('batch-load') && $('batch-file')) {
      $('batch-load').addEventListener('click', function () { $('batch-file').value = ''; $('batch-file').click(); });
      $('batch-file').addEventListener('change', function () {
        var file = this.files && this.files[0];
        this.value = '';
        loadRosterFile(file);
      });
    }
    $('next-1').addEventListener('click', function () { goTo(2); });
    $('back-2').addEventListener('click', function () { goTo(1); });
    $('next-2').addEventListener('click', function () { goTo(3); });
    $('back-3').addEventListener('click', function () { goTo(2); });
    $('fix-rows').addEventListener('click', function () { goTo(2); });
    $('save').addEventListener('click', saveFile);
    var cards = window.AlloPacketPrintCards || window.AlloPacketsPrintCards;
    var loadVocabPictures = symbols && media ? function () {
      if (pictureState === 'ready') return Promise.resolve(true);
      pictureState = 'loading';
      return Promise.all([media.pictures(symbols), loadExtSymbols()]).then(function (res) {
        pictureState = res[0] ? 'ready' : 'failed';
        if (pictureState === 'ready') redraft();
        return !!res[0];
      }, function () {
        pictureState = 'failed';
        return false;
      });
    } : null;
    var ownVocabPictures = function (wordList) {
      var map = Object.create(null);
      (Array.isArray(wordList) ? wordList : []).forEach(function (w) {
        var k = builder.keyOf(w);
        var wEdit = edits && edits.words && isObject(edits.words[k]) ? edits.words[k] : null;
        if (wEdit && wEdit.noPicture === true) { map[w] = { picture: { none: true } }; return; }
        var pic = myPictures[k];
        if (pic && pic.dataUri) map[w] = { picture: { dataUri: pic.dataUri, credit: pic.credit || { own: true } } };
      });
      return Promise.resolve(map);
    };
    if (cards && typeof cards.wire === 'function' && $('print-cards')) cards.wire($('print-cards'), function () {
      return {
        words: rows.map(function (r) { return r.word; }),
        title: state.title || 'Vocabulary words',
        pictures: true,
        symbols: symbols,
        readingSymbolsExt: extSymbols,
        semantic: semantic,
        matcher: state.diagrams ? matcher : null,
        syllables: (window.AlloModules && window.AlloModules.SyllableTableEn) || null,
        loadPictures: loadVocabPictures,
        own: ownVocabPictures
      };
    });
    var vocabWorksheetState = function () {
      return {
        title: state.title || 'Vocabulary practice',
        entries: rows.map(function (r) {
          var wEdit = edits && edits.words && isObject(edits.words[r.key]) ? edits.words[r.key] : null;
          var noPic = !!(r.pictureOff || (wEdit && wEdit.noPicture === true));
          var picUri = '';
          var picSet = '';
          var picCredit = null;
          if (!noPic) {
            if (r.customPicture) {
              picUri = r.customPicture;
              picSet = 'own';
              picCredit = (myPictures[r.key] && myPictures[r.key].credit) || { own: true };
            } else if (myPictures[r.key] && myPictures[r.key].dataUri) {
              picUri = myPictures[r.key].dataUri;
              picSet = 'own';
              picCredit = myPictures[r.key].credit || { own: true };
            } else if (r.diagramSvg && !(art && art.svgRefusal(r.diagramSvg))) {
              picUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(r.diagramSvg);
              picSet = 'diagram';
            } else if (pictureState === 'ready') {
              var got = getSymbolEntry(r.word) || (r.pictureLookupWord ? getSymbolEntry(r.pictureLookupWord) : null);
              if (!got && matcher && typeof matcher.matchWord === 'function') {
                try {
                  var matched = matcher.matchWord({ word: r.word, lemma: r.base || '', definition: r.def || '' }, { symbols: symbols, readingSymbolsExt: extSymbols, semantic: semantic, preferDiagrams: !!state.diagrams });
                  if (matched && typeof matched.svg === 'string') got = matched;
                } catch (_) {}
              }
              if (got && typeof got.svg === 'string' && !(art && art.svgRefusal(got.svg))) {
                picUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(got.svg);
                picSet = got.set || 'mulberry';
              }
            }
          }
          return {
            word: r.word,
            meaning: r.def || '',
            example: r.example || '',
            blank: r.blank && r.blank.ask ? r.blank.ask : '',
            blankAnswer: r.blank && r.blank.answer ? r.blank.answer : r.word,
            picture: picUri,
            pictureSet: picSet,
            pictureCredit: picCredit,
            noPicture: noPic
          };
        }),
        pictures: true,
        symbols: symbols,
        readingSymbolsExt: extSymbols,
        semantic: semantic,
        matcher: state.diagrams ? matcher : null,
        syllablesTable: (window.AlloModules && window.AlloModules.SyllableTableEn) || null,
        loadPictures: loadVocabPictures,
        own: ownVocabPictures,
        creditLine: myWords && typeof myWords.creditLine === 'function' ? myWords.creditLine : null,
        lesson: built && built.lesson ? built.lesson : null,
        wordClips: built && built.clips ? built.clips : myClips,
        meaningClips: meaningClipsNow || null
      };
    };
    if (cards && typeof cards.wireVocabWorksheet === 'function' && $('print-worksheet')) cards.wireVocabWorksheet($('print-worksheet'), vocabWorksheetState);
    if (cards && typeof cards.wireVocabAudio === 'function' && $('worksheet-audio')) cards.wireVocabAudio($('worksheet-audio'), vocabWorksheetState);
    if ($('download-bundle')) $('download-bundle').addEventListener('click', function () {
      if (!built || !built.html) return;
      var zipKit = window.AlloPacketZip;
      if (!zipKit || typeof zipKit.create !== 'function' || !cards || typeof cards.buildVocabWorksheetHtml !== 'function') return;
      var btn = $('download-bundle');
      var prevText = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Building bundle...'; }
      var restore = function () {
        if (btn) { btn.disabled = false; btn.textContent = prevText || 'Download classroom bundle (.zip)'; }
      };
      var wsState = vocabWorksheetState();
      var ext = '.html';
      var docxExt = '.docx';
      var finishZip = function (extraEntries) {
        try {
          var zip = zipKit.create();
          zip.add('01-Interactive-Packet' + ext, built.html);
          zip.add('02-Worksheet-Scaffolded' + ext, cards.buildVocabWorksheetHtml(wsState, { showPictures: true, showWordBank: true, showSyllables: true, includeAnswerKey: false }));
          zip.add('03-Worksheet-Independent' + ext, cards.buildVocabWorksheetHtml(wsState, { showPictures: true, showWordBank: false, showSyllables: false, includeAnswerKey: false }));
          zip.add('04-Teacher-Answer-Key' + ext, cards.buildVocabWorksheetHtml(wsState, { showPictures: true, showWordBank: true, showSyllables: true, includeAnswerKey: true }));
          (extraEntries || []).forEach(function (entry) {
            if (entry && entry.name && entry.data !== undefined && entry.data !== null) zip.add(entry.name, entry.data);
          });
          if (typeof cards.buildVocabAudioPlan === 'function') {
            try {
              var audioPlan = cards.buildVocabAudioPlan(wsState, {});
              if (audioPlan && audioPlan.clipCount > 0) {
                var audioHtml = typeof cards.buildAudioCompanionHtml === 'function'
                  ? cards.buildAudioCompanionHtml(audioPlan)
                  : (typeof cards.buildVocabAudioCompanionHtml === 'function' ? cards.buildVocabAudioCompanionHtml(wsState) : '');
                if (audioHtml) zip.add('08-Offline-Audio-Companion' + ext, audioHtml);
              }
            } catch (_) {}
          }
          var zipName = fileName((built.lesson && built.lesson.title) || state.title || 'vocabulary', '-classroom-bundle.zip');
          var url = '';
          try { url = URL.createObjectURL(new Blob(zip.finish(), { type: 'application/zip' })); } catch (_) { url = ''; }
          if (url) {
            download(url, zipName);
            window.setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 10000);
          }
        } finally {
          restore();
        }
      };
      var loadDocx = typeof cards.ensureDocx === 'function'
        ? cards.ensureDocx()
        : Promise.resolve(window.AlloPacketDocx || window.AlloPacketsDocx || null);
      Promise.resolve(loadDocx).then(function (docxMod) {
        if (!docxMod) { finishZip([]); return; }
        var prep = function (m) {
          if (typeof cards.prepareDocxModelAsync === 'function') return cards.prepareDocxModelAsync(docxMod, m);
          if (typeof docxMod.prepareImagesAsync === 'function') {
            return Promise.resolve().then(function () { return docxMod.prepareImagesAsync(m, window, doc); }).then(function (p) { return p || m; }, function () { return m; });
          }
          return Promise.resolve(m);
        };
        var jobs = [];
        if (typeof docxMod.buildVocabDocx === 'function' && typeof cards.normalizeVocabWorksheetModel === 'function' && typeof cards.buildVocabDocxModel === 'function') {
          try {
            var scaffModel = cards.normalizeVocabWorksheetModel(wsState, { wordBank: true, pictures: true, syllables: true, answerKey: false });
            if (scaffModel && scaffModel.entries && scaffModel.entries.length) {
              var scaffDoc = cards.buildVocabDocxModel(scaffModel);
              jobs.push(prep(scaffDoc).then(function (prepared) {
                var res = docxMod.buildVocabDocx(prepared, { zip: zipKit, filename: '05-Worksheet-Scaffolded' + docxExt });
                return res && res.bytes ? { name: '05-Worksheet-Scaffolded' + docxExt, data: res.bytes } : null;
              }, function () { return null; }));
            }
            var indepModel = cards.normalizeVocabWorksheetModel(wsState, { wordBank: false, pictures: true, syllables: false, answerKey: false });
            if (indepModel && indepModel.entries && indepModel.entries.length) {
              var indepDoc = cards.buildVocabDocxModel(indepModel);
              jobs.push(prep(indepDoc).then(function (prepared) {
                var res = docxMod.buildVocabDocx(prepared, { zip: zipKit, filename: '06-Worksheet-Independent' + docxExt });
                return res && res.bytes ? { name: '06-Worksheet-Independent' + docxExt, data: res.bytes } : null;
              }, function () { return null; }));
            }
          } catch (_) {}
        }
        if (typeof docxMod.buildWordCardsDocx === 'function') {
          try {
            var rawEntries = Array.isArray(wsState.entries) ? wsState.entries : [];
            var cardWords = rawEntries.map(function (e) { return e && e.word; }).filter(Boolean);
            if (cardWords.length) {
              var pics = Object.create(null);
              rawEntries.forEach(function (e) {
                if (e && e.word && e.picture && !e.noPicture) {
                  pics[e.word] = { uri: e.picture, set: e.pictureSet || 'mulberry', credit: e.pictureCredit || null };
                }
              });
              var cardList = rawEntries.map(function (e) {
                if (!e || !e.word) return null;
                var p = pics[e.word];
                return { word: e.word, displayWord: e.word, pictureUri: p && p.uri ? p.uri : '' };
              }).filter(Boolean);
              var cardsModel = {
                title: wsState.title || 'Vocabulary Word Cards',
                cards: cardList,
                size: 6,
                shows: 'both',
                lines: true,
                pages: 'both',
                credits: typeof cards.creditsFor === 'function' ? cards.creditsFor(cardWords, pics, wsState.symbols, wsState.creditLine) : []
              };
              jobs.push(prep(cardsModel).then(function (prepared) {
                var res = docxMod.buildWordCardsDocx(prepared, { zip: zipKit, filename: '07-Word-Cards' + docxExt });
                return res && res.bytes ? { name: '07-Word-Cards' + docxExt, data: res.bytes } : null;
              }, function () { return null; }));
            }
          } catch (_) {}
        }
        return Promise.all(jobs).then(function (entries) {
          finishZip(entries.filter(Boolean));
        }, function () {
          finishZip([]);
        });
      }, function () {
        finishZip([]);
      });
    });
    if ($('print-worksheet') && $('print-cards') && $('print-cards').hidden) $('print-worksheet').hidden = true;
    function readReopenFile(file) {
      if (!file) return;
      if (file.size > MAX_REOPEN_BYTES) { reopenNote('This file is too large to be a file made here.'); return; }
      var done = function (buf) {
        var text = typeof TextDecoder === 'function' ? new TextDecoder('utf-8').decode(buf) : '';
        reopen(text, file.name, buf);
      };
      if (typeof file.arrayBuffer === 'function') {
        file.arrayBuffer().then(done, function () { reopenNote('This browser could not read the file.'); });
      } else {
        var reader = new FileReader();
        reader.onload = function () { reopen(String(reader.result || ''), file.name); };
        reader.onerror = function () { reopenNote('This browser could not read the file.'); };
        reader.readAsText(file);
      }
    }
    $('reopen-choose').addEventListener('click', function () { $('reopen-file').click(); });
    $('reopen-file').addEventListener('change', function () {
      var file = this.files && this.files[0];
      this.value = '';
      readReopenFile(file);
    });
    if ($('reopen-close')) $('reopen-close').addEventListener('click', function () {
      show('reopen-note', false);
      reopenPending = null;
      if ($('reopen-choose')) $('reopen-choose').focus();
    });
    var dropHost = doc.querySelector('main') || doc.body;
    if (dropHost) {
      var hasFiles = function (e) { return !!(e && e.dataTransfer && e.dataTransfer.types && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0); };
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
        var handoff = window.AlloPacketHandoff;
        if (!reopenPending || !handoff || typeof handoff.redirect !== 'function') return;
        event.preventDefault();
        var target = reopenPending;
        reopenPending = null;
        handoff.redirect(target.file, target.href, target.hash).catch(function () { $('reopen-page').click(); });
      });
    }
    $('forget').addEventListener('click', function () {
      try { window.localStorage.removeItem(STORE_KEY); } catch (_) {}
      resetPreview(true);
      state = defaults();
      $('f-words').value = '';
      $('f-title').value = '';
      if ($('f-batch-names')) $('f-batch-names').value = '';
      if ($('f-diagrams')) $('f-diagrams').checked = false;
      setText('custom-pic-said', '');
      show('rehearse-note', false);
      show('reopen-note', false);
      goTo(1, true);
      setText('forget-said', 'Done. Your choices are back to how they started.');
    });
    $('forget-edits').addEventListener('click', function () {
      try { window.localStorage.removeItem(EDITS_KEY); } catch (_) {}
      resetPreview(true);
      edits = freshEdits();
      redraft();
      if (step === 2) drawRows();
      if (step === 3) { drawStep3(); makeSoon(30); }
      setText('forget-said', 'Done. Your changes to the questions are gone. The questions are the ones the word list gives.');
    });
  }

  function applyRehearseHash() {
    var hash = String(window.location && window.location.hash ? window.location.hash : '');
    var match = /^#rehearse=(.+)$/i.exec(hash);
    if (!match) return 0;
    var parsed = '';
    try { parsed = decodeURIComponent(match[1]); } catch (_) { parsed = match[1]; }
    var unique = [];
    parsed.split(/[,;\r\n]+/).forEach(function (raw) {
      var word = String(raw || '').replace(/\s+/g, ' ').trim();
      if (!word) return;
      var low = word.toLowerCase();
      if (unique.every(function (x) { return x.toLowerCase() !== low; }) && unique.length < 40) unique.push(word);
    });
    if (unique.length) {
      state.words = unique.join('\n').slice(0, MAX_TYPED);
      if ($('f-words')) $('f-words').value = state.words;
      remember();
      drawWords();
    }
    try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
    return unique.length;
  }

  function start() {
    loader = window.AlloWordSoundsTakeHome;
    builder = window.AlloPacketVocab;
    var missing = [];
    var adapters = loader && loader.CHECK_ADAPTERS;
    if (!loader || typeof loader.buildHtml !== 'function' || !adapters || !adapters.vocab_meaning || !adapters.vocab_word || !adapters.vocab_blank) missing.push('the part that writes the file');
    if (!builder || typeof builder.draftRows !== 'function' || typeof builder.buildVocabPacket !== 'function') missing.push('the part that makes the questions');
    if (missing.length) {
      show('loading', false);
      setText('load-problem-text', 'Missing: ' + listed(missing) + '. Check the connection, then load the page again. Nothing has been lost.');
      show('load-problem', true);
      return;
    }
    state = recall();
    edits = recallEdits();
    // Recordings and pictures need the network (this site only); a browser without fetch makes files without them.
    media = window.AlloVocabMedia && typeof window.AlloVocabMedia.clips === 'function' && typeof window.fetch === 'function' ? window.AlloVocabMedia : null;
    var sym = window.AlloModules && window.AlloModules.WordSoundsSymbols;
    var extSym = window.AlloReadingSymbolsExt || (window.AlloModules && window.AlloModules.ReadingSymbolsExt) || null;
    semantic = window.AlloWordPictureSemantic || (window.AlloModules && window.AlloModules.WordPictureSemantic) || null;
    art = window.AlloPacketBuilder && typeof window.AlloPacketBuilder.svgRefusal === 'function' ? window.AlloPacketBuilder : null;
    matcher = window.AlloWordPictureMatcher || (window.AlloModules && window.AlloModules.WordPictureMatcher) || null;
    myWords = window.AlloPacketMyWords && (typeof window.AlloPacketMyWords.getManyMedia === 'function' || typeof window.AlloPacketMyWords.getMany === 'function') ? window.AlloPacketMyWords : null;
    symbols = media && art && sym && typeof sym.has === 'function' && typeof sym.file === 'function' && typeof sym.get === 'function' ? sym : null;
    extSymbols = symbols && extSym && typeof extSym.has === 'function' && typeof extSym.file === 'function' && typeof extSym.get === 'function' ? extSym : null;
    if (loader.DEFAULT_LABELS && loader.DEFAULT_LABELS.save_work) setText('csv-label', loader.DEFAULT_LABELS.save_work);
    wire();
    var rehearseCount = applyRehearseHash();
    // "#check-mode" / "#practice-mode" (the front door's cards) start on that kind of file, whatever was remembered.
    var rawHash = String(window.location && window.location.hash || '');
    var kindHash = /^#(check|practice)-mode$/i.exec(rawHash);
    if (kindHash) {
      state.mode = kindHash[1].toLowerCase(); syncMode(); remember();
      try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (_) {}
    }
    var wantStep2 = /^#step=2$/i.test(rawHash);
    if (wantStep2) {
      try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (_) {}
    }
    show('reopen', !!(window.AlloPacketVerify && typeof window.AlloPacketVerify.readParts === 'function' && typeof FileReader === 'function'));
    show('loading', false);
    drawMoreSummary();
    if (myWords) {
      migrateLegacyPictures();
      // A change made in another tab (a recording made on the computer-voice page, 2026-11-23): the file is made again
      // with it, so the teacher has nothing to press on coming back.
      if (typeof myWords.onChange === 'function') myWords.onChange(function (change) { if (!change || !change.here) { syncMyPictures(); if (step === 3 && built) makeSoon(300); } });
    }
    startBank();
    if (!(window.AlloModules && window.AlloModules.SyllableTableEn) && doc && doc.createElement && !(doc.querySelector && doc.querySelector('script[data-allo-syllable-table="1"]'))) {
      try {
        var sylSc = doc.createElement('script');
        sylSc.src = 'syllable_table_en.js';
        sylSc.async = true;
        sylSc.setAttribute('data-allo-syllable-table', '1');
        sylSc.onload = function () { if (step === 3 && built) makeSoon(60); };
        (doc.head || doc.documentElement).appendChild(sylSc);
      } catch (_) {}
    }
    if (rehearseCount >= 4) {
      setText('rehearse-note', 'Loaded ' + count(rehearseCount, 'missed word') + ' from results. Review the questions below, or change the word list in step 1.');
      show('rehearse-note', true);
      if (bankState === 'loading') { pendingRehearseStep2 = true; goTo(1, true); }
      else goTo(2, true);
    } else if (wantStep2 && listNow().words.length >= 4) {
      if (bankState === 'loading') { pendingRehearseStep2 = true; goTo(1, true); }
      else goTo(2, true);
    } else {
      if (rehearseCount > 0) {
        reopenNote('Loaded ' + count(rehearseCount, 'missed word') + ' from results. Add ' + count(4 - rehearseCount, 'more word') + ' so each question has 4 choices.', []);
      }
      goTo(1, true);
    }
    syncMyPictures();
    takeHanded();
    window.addEventListener('pagehide', function () {
      if (fileUrl) { try { URL.revokeObjectURL(fileUrl); } catch (_) {} fileUrl = ''; }
      try { stopPreviewSession(); } catch (_) {}
    });
  }

  try { start(); } catch (error) {
    show('loading', false);
    setText('load-problem-text', 'The page stopped while starting (' + said(error) + '). Load the page again. Nothing has been lost.');
    show('load-problem', true);
  }
})();
