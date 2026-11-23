// Recordings and pictures for the vocabulary maker (packets-vocab.html), 2026-11-12. Both come from this site only,
// as relative addresses, and the page's rule (connect-src 'self') refuses anything else:
//   - recordings: the word store of Word Sounds (word_audio_shards/index.json and the small files it names). Each clip
//     is a machine voice made ahead of time (Kokoro-82M, voice af_heart). Only the files that hold the wanted words are
//     fetched. A clip is turned into WAV here, which every browser plays (iPad and older Safari do not play WebM), with
//     the take-home loader's own converter (portableAudio), which decodes with an offline context: no sound device opens.
//   - pictures: the data files of the Word Sounds picture set (word_sounds_symbols_en.js names them), all of them, the
//     same files whatever words are chosen, as the Word Sounds maker fetches them.
// Plain script: window.AlloVocabMedia. Nothing here runs until the page asks.
(function (root) {
  'use strict';

  var INDEX = 'word_audio_shards/index.json';
  var FORMAT = 'alloflow-word-audio-index/1';
  var FILE_NAME = /^[a-z0-9_][a-z0-9_-]*\.json$/;
  var AUDIO = /^data:audio\/[a-z0-9.+-]+(?:;[a-z0-9=.+-]+)*;base64,/i;
  var CONCURRENCY = 6;
  var own = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  var isObject = function (v) { return !!v && typeof v === 'object' && !Array.isArray(v); };

  var index = null, loadingIndex = null, files = Object.create(null), wavs = Object.create(null);
  function safeJsonParse(raw) {
    return JSON.parse(raw, function (k, v) {
      return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
    });
  }
  function getJson(url) {
    var ctrl = typeof root.AbortController === 'function' ? new root.AbortController() : null;
    var timer = 0;
    return new Promise(function (resolve, reject) {
      timer = typeof root.setTimeout === 'function' ? root.setTimeout(function () {
        if (ctrl) { try { ctrl.abort(); } catch (_) {} }
        reject(new Error(url + ' timed out'));
      }, 15000) : 0;
      Promise.resolve().then(function () {
        return ctrl ? root.fetch(url, { signal: ctrl.signal }) : root.fetch(url);
      }).then(function (reply) {
        if (!reply || !reply.ok) throw new Error(url + ' answered ' + (reply ? reply.status : 0));
        return reply.text();
      }).then(function (text) {
        if (timer && typeof root.clearTimeout === 'function') root.clearTimeout(timer);
        resolve(safeJsonParse(text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text));
      }, function (err) {
        if (timer && typeof root.clearTimeout === 'function') root.clearTimeout(timer);
        reject(err);
      });
    });
  }
  // The store's index (about 100 KB): which word is in which file.
  function store() {
    if (!gettingKit) startKit(); // the MP3 encoder starts loading with the recordings index
    if (index) return Promise.resolve(index);
    if (!loadingIndex) {
      loadingIndex = getJson(INDEX).then(function (data) {
        if (!isObject(data) || data.format !== FORMAT || !isObject(data.words) || !isObject(data.shards)) throw new Error(INDEX + ' is not a word store index');
        index = data;
        loadingIndex = null;
        return data;
      }, function (error) { loadingIndex = null; throw error; });
    }
    return loadingIndex;
  }
  function fileOf(word) {
    if (!index || !own(index.words, word)) return null;
    var key = index.words[word], shard = typeof key === 'string' && own(index.shards, key) ? index.shards[key] : null;
    return shard && typeof shard.file === 'string' && FILE_NAME.test(shard.file) ? { url: INDEX.replace(/[^/]*$/, '') + shard.file, bytes: shard.bytes > 0 ? shard.bytes : 0 } : null;
  }
  // What getting these words would take: { words: [the words the store has], download: bytes still to fetch }.
  function plan(words) {
    var have = (words || []).filter(function (w) { return !!fileOf(w); }), seen = Object.create(null), download = 0;
    have.forEach(function (w) { var f = fileOf(w); if (!seen[f.url] && !files[f.url]) { seen[f.url] = true; download += f.bytes; } });
    return { words: have, download: download };
  }
  function DecodeContext() {
    var Offline = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    return new Offline(1, 1, 22050);
  }
  // Resolves to { word: WAV data address } for those of these words the store has. onProgress(text) says how far it is.
  function clips(words, loader, onProgress) {
    var tell = function (text) { if (typeof onProgress === 'function') { try { onProgress(text); } catch (_) {} } };
    return store().then(function () {
      var want = plan(words).words, urls = [];
      want.forEach(function (w) { var f = fileOf(w); if (urls.indexOf(f.url) < 0 && !files[f.url]) urls.push(f.url); });
      var done = 0, cursor = 0;
      var workers = Array.from({ length: Math.min(CONCURRENCY, urls.length) }, function () {
        return (function next() {
          if (cursor >= urls.length) return Promise.resolve();
          var url = urls[cursor++];
          return getJson(url).then(function (data) {
            if (!isObject(data)) throw new Error(url + ' is not a sound file');
            files[url] = data;
            tell('Getting the recordings: ' + (++done) + ' of ' + urls.length + ' small files.');
          }).then(next);
        })();
      });
      return Promise.all(workers).then(function () {
        var todo = { audio: Object.create(null) };
        want.forEach(function (w) {
          if (own(wavs, w)) return;
          var shardObj = files[fileOf(w).url];
          var wordsMap = isObject(shardObj) && isObject(shardObj.words) ? shardObj.words : shardObj;
          var clip = own(wordsMap, w) ? wordsMap[w] : null;
          if (typeof clip === 'string' && AUDIO.test(clip)) todo.audio[w] = clip;
        });
        var names = Object.keys(todo.audio);
        if (!names.length) return null;
        if (!loader || typeof loader.portableAudio !== 'function') throw new Error('the part that converts recordings is missing');
        tell('Getting the recordings ready: ' + names.length + ' words.');
        return loader.portableAudio(todo, { AudioContext: DecodeContext }).then(function () {
          return smaller();
        }).then(function (kit) {
          // As MP3 when the encoder is here (about 8 to 10 times smaller than WAV), else the WAV.
          names.forEach(function (w) {
            if (!/^data:audio\/(?:wav|x-wav|wave)[;,]/i.test(todo.audio[w])) return;
            var mp3 = null;
            if (kit && typeof kit.wavUriToMp3Uri === 'function') {
              try { mp3 = kit.wavUriToMp3Uri(todo.audio[w], 48); } catch (_) { mp3 = null; }
            }
            wavs[w] = mp3 || todo.audio[w];
          });
        });
      }).then(function () {
        var out = {};
        want.forEach(function (w) {
          if (!own(wavs, w)) return;
          if (readyKit && typeof readyKit.wavUriToMp3Uri === 'function' && /^data:audio\/(?:wav|x-wav|wave)[;,]/i.test(wavs[w])) {
            try {
              var upgraded = readyKit.wavUriToMp3Uri(wavs[w], 48);
              if (upgraded) wavs[w] = upgraded;
            } catch (_) {}
          }
          out[w] = wavs[w];
        });
        return out;
      });
    });
  }
  // The shared sound helpers and the app's MP3 encoder (packets_audio_kit.js, lame.min.js), from this site, once. null when they cannot be had.
  // Loading starts the first time recordings are asked for; wait briefly (up to 1.5 s) so even the first build encodes MP3 instead of caching WAV.
  var gettingKit = null, readyKit = null;
  var KIT_WAIT_MS = 1500;
  var KIT_LOAD_MS = 15000;
  function startTimer(fn, ms) {
    if (root && typeof root.setTimeout === 'function') return root.setTimeout(fn, ms);
    return typeof setTimeout === 'function' ? setTimeout(fn, ms) : null;
  }
  function stopTimer(id) {
    if (id == null) return;
    if (root && typeof root.clearTimeout === 'function') { root.clearTimeout(id); return; }
    if (typeof clearTimeout === 'function') clearTimeout(id);
  }
  function smaller() {
    if (readyKit) return Promise.resolve(readyKit);
    if (!gettingKit) startKit();
    var timer = null;
    var cap = new Promise(function (resolve) {
      timer = startTimer(function () { resolve(readyKit); }, KIT_WAIT_MS);
    });
    return Promise.race([gettingKit, cap]).then(function (kit) {
      stopTimer(timer);
      return kit || readyKit;
    });
  }
  function startKit() {
    gettingKit = new Promise(function (resolve) {
      if (root.AlloPacketAudioKit) { resolve(root.AlloPacketAudioKit); return; }
      var doc = root.document, script = doc && doc.createElement ? doc.createElement('script') : null;
      if (!script || !doc.head) { resolve(null); return; }
      var settled = false, timer = null;
      var finish = function (val, remove) {
        if (settled) return;
        settled = true;
        stopTimer(timer);
        script.onload = null;
        script.onerror = null;
        if (remove) { try { if (script.parentNode) script.parentNode.removeChild(script); } catch (_) {} }
        resolve(val);
      };
      script.src = 'packets_audio_kit.js';
      script.onload = function () { finish(root.AlloPacketAudioKit || null, false); };
      script.onerror = function () { finish(null, true); };
      timer = startTimer(function () { finish(null, true); }, KIT_LOAD_MS);
      doc.head.appendChild(script);
    }).then(function (kit) {
      return kit ? kit.getMp3().then(function (ok) { readyKit = ok ? kit : null; return readyKit; }, function () { return null; }) : null;
    }).then(function (kit) {
      if (!kit) gettingKit = null;
      return kit;
    });
    return gettingKit;
  }
  // The picture set's drawings, all of its data files, once.
  var loadingPictures = null;
  function loadLocalScript(src) {
    return new Promise(function (resolve) {
      var doc = root.document, script = doc && doc.createElement ? doc.createElement('script') : null;
      if (!script || !doc.head) { resolve(false); return; }
      var settled = false, timer = null;
      var finish = function (ok) {
        if (settled) return;
        settled = true;
        stopTimer(timer);
        script.onload = null; script.onerror = null;
        resolve(ok);
      };
      script.src = src;
      script.onload = function () { finish(true); };
      script.onerror = function () { finish(false); };
      timer = startTimer(function () { finish(false); }, KIT_LOAD_MS);
      doc.head.appendChild(script);
    });
  }
  var loadingPictureExtras = null;
  function pictureExtras() {
    if (loadingPictureExtras) return loadingPictureExtras;
    var needExt = !(root.AlloReadingSymbolsExt || (root.AlloModules && root.AlloModules.ReadingSymbolsExt));
    var needSem = !(root.AlloWordPictureSemantic || (root.AlloModules && root.AlloModules.WordPictureSemantic));
    loadingPictureExtras = Promise.all([
      needExt ? loadLocalScript('reading_symbols_ext_en.js') : Promise.resolve(true),
      needSem ? loadLocalScript('word_picture_semantic_en.js') : Promise.resolve(true),
    ]).then(function () {
      var ext = root.AlloReadingSymbolsExt || (root.AlloModules && root.AlloModules.ReadingSymbolsExt) || null;
      if (ext && Array.isArray(ext.shards) && !(typeof ext.ready === 'function' && ext.ready()) && typeof root.fetch === 'function') {
        return Promise.all(ext.shards.map(function (shard) {
          return getJson(shard.url).then(function (data) { ext.add(data); }, function () {});
        })).then(function () { return true; });
      }
      return true;
    }, function () { loadingPictureExtras = null; return false; });
    return loadingPictureExtras;
  }
  function pictures(symbols) {
    if (!symbols || typeof symbols.ready !== 'function') return Promise.reject(new Error('the picture list is missing'));
    if (symbols.ready()) return Promise.resolve(true);
    if (!loadingPictures) {
      loadingPictures = Promise.all(symbols.shards.map(function (shard) {
        return getJson(shard.url).then(function (data) { symbols.add(data); });
      })).then(function () { loadingPictures = null; return symbols.ready(); }, function (error) { loadingPictures = null; throw error; });
    }
    return loadingPictures;
  }

  root.AlloVocabMedia = { INDEX: INDEX, store: store, plan: plan, clips: clips, pictures: pictures, pictureExtras: pictureExtras, ready: function () { return !!index; } };
})(typeof window !== 'undefined' ? window : globalThis);
