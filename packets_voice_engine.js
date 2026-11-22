// The computer voice of the two Packets pages that use one: "Make recordings with a computer voice"
// (packets-voice.html) and "Make a read-along" (packets-read-along.html). One copy of how the voice is started
// and how its sound is taken, so the two pages cannot drift apart.
//
// It builds nothing of its own:
//   - the voice is the app's own loader (kokoro_tts_loader.js), started the way the app starts it: the program
//     that runs it comes from this site and is checked before it runs (runtime_graph_delivery_policy.js,
//     runtime_graph_host.js, engine_runtime_integrity.json). Only the voice itself (about 88 MB) is downloaded
//     from Hugging Face, by that loader;
//   - a smaller recording (MP3) is made by the app's own encoder (lame.min.js), with the app's recipe for a
//     read-aloud sentence: one channel, 64 kbps. The WAV and MP3 code is packets_audio_kit.js, shared with the Word
//     Sounds maker, loaded first when the voice is asked for.
// Nothing is loaded or downloaded until get() is called, which a page does only when the teacher presses
// "Get the voice". This file names no other site.
(function (win) {
  'use strict';
  var doc = win.document;
  var VOICE_FILES = ['packets_audio_kit.js', 'runtime_graph_delivery_policy.js', 'runtime_graph_host.js'];
  var CATALOG = 'engine_runtime_integrity.json', LOADER = 'kokoro_tts_loader.js';
  var kit = function () { return win.AlloPacketAudioKit || null; };
  var ready = false, getting = null, added = Object.create(null);

  function addScript(src) {
    if (added[src] === true) return Promise.resolve();
    if (added[src]) return added[src];
    var p = new Promise(function (resolve, reject) {
      var script = doc.createElement('script');
      script.src = src;
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        delete added[src];
        try { if (script.parentNode) script.parentNode.removeChild(script); } catch (_) {}
        reject(new Error('A part of the page timed out: ' + src + '.'));
      }, 15000);
      script.onload = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        added[src] = true;
        resolve();
      };
      script.onerror = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        delete added[src];
        try { if (script.parentNode) script.parentNode.removeChild(script); } catch (_) {}
        reject(new Error('A part of the page did not arrive: ' + src + '.'));
      };
      doc.head.appendChild(script);
    });
    added[src] = p;
    return p;
  }

  function fetchCatalog() {
    var ctrl = typeof win.AbortController === 'function' ? new win.AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;
    var clear = function () { if (timer !== null) { clearTimeout(timer); timer = null; } };
    var opts = ctrl ? { cache: 'no-cache', signal: ctrl.signal } : { cache: 'no-cache' };
    return win.fetch(CATALOG, opts).then(function (response) {
      if (!response.ok) throw new Error('The list of voice files did not arrive.');
      return response.json();
    }).then(function (data) { clear(); return data; }, function (err) { clear(); throw err; });
  }

  // Starts the voice. onProgress({ stage, pct }) is the loader's own progress. Resolves when the voice can speak;
  // rejects with a sentence a page can show. A second call while the first runs gets the same promise.
  function get(onProgress) {
    if (ready) return Promise.resolve(true);
    if (getting) return getting;
    var chain = Promise.resolve();
    VOICE_FILES.forEach(function (src) { chain = chain.then(function () { return addScript(src); }); });
    getting = chain.then(fetchCatalog)
      .then(function (catalog) {
        if (typeof win._alloInstallRuntimeGraphHost !== 'function') throw new Error('The voice could not be started in this browser.');
        if (typeof win.__alloCreateVerifiedWorker !== 'function') win._alloInstallRuntimeGraphHost(catalog, win);
        return addScript(LOADER);
      })
      .then(function () {
        if (!win._kokoroTTS || typeof win._kokoroTTS.init !== 'function') throw new Error(win.__kokoroTTSUnavailableReason ? 'The voice cannot run in this browser.' : 'The voice could not be started in this browser.');
        return win._kokoroTTS.init(onProgress);
      })
      .then(function (ok) {
        if (ok === false) throw new Error('The voice did not start. Check the connection and try again.');
        ready = true;
        getting = null;
        return true;
      }, function (error) { getting = null; throw error; });
    return getting;
  }

  // The voice says the text: the loader's WAV, as bytes. options: { word: true for one word, signal }.
  // A new recording every time (force), not the loader's remembered one. Rejects with error.code
  // 'no_sound' (the voice gave nothing) or 'bad_sound' (not a WAV), or the loader's own AbortError.
  var MAX_WAV_BYTES = 20 * 1024 * 1024;
  function speak(text, voice, options) {
    var o = options || {};
    if (!ready || !win._kokoroTTS) return Promise.reject(new Error('The voice is not ready.'));
    return win._kokoroTTS.speak(text, voice || 'af_heart', 1, { word: o.word === true, force: true, signal: o.signal }).then(function (url) {
      if (!url) { var none = new Error('The voice gave no sound.'); none.code = 'no_sound'; throw none; }
      if (typeof url !== 'string' || !/^(?:blob|data):/i.test(url)) {
        var badUrl = new Error('The voice gave a sound this page cannot keep.');
        badUrl.code = 'bad_sound';
        throw badUrl;
      }
      return (o.signal ? win.fetch(url, { signal: o.signal }) : win.fetch(url)).then(function (response) {
        if (response && response.ok === false) throw new Error('The voice audio could not be read.');
        return response.arrayBuffer();
      });
    }).then(function (buffer) {
      var bytes = new Uint8Array(buffer);
      if (bytes.length < 44 || bytes.length > MAX_WAV_BYTES
        || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== 'RIFF'
        || String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) !== 'WAVE') {
        var bad = new Error('The voice gave a sound this page cannot keep.');
        bad.code = 'bad_sound';
        throw bad;
      }
      return bytes;
    });
  }

  // The sound helpers, from packets_audio_kit.js (loaded by get(), or on demand by getMp3() for mic recording).
  var need = function (name) { return function () { var k = kit(); if (!k) throw new Error('The sound helpers did not arrive.'); return k[name].apply(null, arguments); }; };
  var wavInfo = need('wavInfo'), wavMs = need('wavMs'), toDataUri = need('toDataUri'), wavToMp3 = need('wavToMp3');
  function getMp3() {
    var loadKit = kit() ? Promise.resolve() : addScript('packets_audio_kit.js');
    return loadKit.then(function () { return kit() ? kit().getMp3() : false; }, function () { return false; });
  }

  win.AlloPacketVoiceEngine = { get: get, isReady: function () { return ready; }, speak: speak, wavInfo: wavInfo, wavMs: wavMs, toDataUri: toDataUri, getMp3: getMp3, wavToMp3: wavToMp3 };
})(window);
