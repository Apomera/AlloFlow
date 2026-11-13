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
  var own = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  var isObject = function (v) { return !!v && typeof v === 'object' && !Array.isArray(v); };

  var index = null, loadingIndex = null, files = {}, wavs = {};
  function getJson(url) {
    return Promise.resolve().then(function () { return root.fetch(url); }).then(function (reply) {
      if (!reply.ok) throw new Error(url + ' answered ' + reply.status);
      return reply.text();
    }).then(function (text) { return JSON.parse(text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text); });
  }
  // The store's index (about 100 KB): which word is in which file.
  function store() {
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
    var have = (words || []).filter(function (w) { return !!fileOf(w); }), seen = {}, download = 0;
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
      var done = 0;
      return urls.reduce(function (chain, url) {
        return chain.then(function () {
          tell('Getting the recordings: ' + (++done) + ' of ' + urls.length + ' small files.');
          return getJson(url).then(function (data) { if (!isObject(data)) throw new Error(url + ' is not a sound file'); files[url] = data; });
        });
      }, Promise.resolve()).then(function () {
        var todo = { audio: {} };
        want.forEach(function (w) {
          if (wavs[w]) return;
          var clip = files[fileOf(w).url][w];
          if (typeof clip === 'string' && AUDIO.test(clip)) todo.audio[w] = clip;
        });
        var names = Object.keys(todo.audio);
        if (!names.length) return null;
        if (!loader || typeof loader.portableAudio !== 'function') throw new Error('the part that converts recordings is missing');
        tell('Getting the recordings ready: ' + names.length + ' words.');
        return loader.portableAudio(todo, { AudioContext: DecodeContext }).then(function () {
          names.forEach(function (w) { if (/^data:audio\/(?:wav|x-wav|wave)[;,]/i.test(todo.audio[w])) wavs[w] = todo.audio[w]; });
        });
      }).then(function () {
        var out = {};
        want.forEach(function (w) { if (wavs[w]) out[w] = wavs[w]; });
        return out;
      });
    });
  }
  // The picture set's drawings, all of its data files, once.
  var loadingPictures = null;
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

  root.AlloVocabMedia = { INDEX: INDEX, store: store, plan: plan, clips: clips, pictures: pictures, ready: function () { return !!index; } };
})(typeof window !== 'undefined' ? window : globalThis);
