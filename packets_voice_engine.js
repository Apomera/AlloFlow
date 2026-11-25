// Computer voice helper for packets-voice.html and packets-read-along.html.
// Loads packets_audio_kit.js, runtime_graph_delivery_policy.js, runtime_graph_host.js,
// engine_runtime_integrity.json, and kokoro_tts_loader.js lazily on get(). Names no other site.
(function (win) {
  'use strict';
  if (!win || (typeof win !== 'object' && typeof win !== 'function')) return;
  var doc = win.document || null;
  var VOICE_FILES = ['packets_audio_kit.js', 'runtime_graph_delivery_policy.js', 'runtime_graph_host.js'];
  var CATALOG = 'engine_runtime_integrity.json', LOADER = 'kokoro_tts_loader.js';
  var kit = function () { return win.AlloPacketAudioKit || null; };
  var setT = function (fn, ms) { return (win.setTimeout || setTimeout)(fn, ms); };
  var clrT = function (id) { if (id != null) (win.clearTimeout || clearTimeout)(id); };
  var EXPECT = {
    'packets_audio_kit.js': function () { return !!win.AlloPacketAudioKit; },
    'runtime_graph_host.js': function () { return typeof win._alloInstallRuntimeGraphHost === 'function'; },
    'kokoro_tts_loader.js': function () { return !!(win._kokoroTTS && typeof win._kokoroTTS.init === 'function'); },
  };
  var usable = function () { return !!(win._kokoroTTS && typeof win._kokoroTTS.init === 'function' && typeof win._kokoroTTS.speak === 'function' && win._kokoroTTS.ready !== false); };
  var ready = false, getting = null, added = Object.create(null);

  function addScript(src) {
    var ok = EXPECT[src];
    if (added[src] === true) { if (!ok || ok()) return Promise.resolve(); delete added[src]; }
    if (added[src]) return added[src];
    if (!doc || typeof doc.createElement !== 'function') return Promise.reject(new Error('A part of the page did not arrive: ' + src + '.'));
    var p = new Promise(function (resolve, reject) {
      var s = doc.createElement('script'), done = false;
      s.src = src;
      var fail = function (msg) {
        if (done) return;
        done = true; clrT(timer); s.onload = s.onerror = null; delete added[src];
        try { if (s.parentNode) s.parentNode.removeChild(s); } catch (_) {}
        reject(new Error(msg));
      };
      var timer = setT(function () { fail('A part of the page timed out: ' + src + '.'); }, 15000);
      s.onload = function () {
        if (done) return;
        if (ok && !ok()) { fail(src === LOADER && win.__kokoroTTSUnavailableReason ? 'The voice cannot run in this browser.' : 'A part of the page did not start: ' + src + '.'); return; }
        done = true; clrT(timer); s.onload = s.onerror = null; added[src] = true; resolve();
      };
      s.onerror = function () { fail('A part of the page did not arrive: ' + src + '.'); };
      var host = doc && (doc.head || doc.documentElement);
      if (!host) { fail('A part of the page did not arrive: ' + src + '.'); return; }
      host.appendChild(s);
    });
    added[src] = p;
    return p;
  }

  function fetchCatalog() {
    if (typeof win.fetch !== 'function') return Promise.reject(new Error('The list of voice files did not arrive.'));
    var ctrl = typeof win.AbortController === 'function' ? new win.AbortController() : null, timed = false;
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setT(function () { timed = true; if (ctrl) { try { ctrl.abort(); } catch (_) {} } if (!done) { done = true; reject(new Error('The list of voice files timed out.')); } }, 15000);
      var clear = function () { if (timer !== null) { clrT(timer); timer = null; } };
      Promise.resolve().then(function () { return win.fetch(CATALOG, ctrl ? { cache: 'no-cache', signal: ctrl.signal } : { cache: 'no-cache' }); }).then(function (r) {
        if (!r || !r.ok) throw new Error('The list of voice files did not arrive.');
        return r.json();
      }).then(function (d) { clear(); if (!done) { done = true; resolve(d); } }, function (err) { clear(); if (!done) { done = true; reject(timed ? new Error('The list of voice files timed out.') : err); } });
    });
  }

  function abortErr() { var e = new Error('The voice was stopped.'); e.name = 'AbortError'; return e; }
  function badSound() { var e = new Error('The voice gave a sound this page cannot keep.'); e.code = 'bad_sound'; return e; }
  function raceWait(promise, sig, ms) {
    if (sig && sig.aborted) return Promise.reject(abortErr());
    return new Promise(function (resolve, reject) {
      var done = false, timer = null;
      var clean = function () { clrT(timer); timer = null; if (sig && typeof sig.removeEventListener === 'function') try { sig.removeEventListener('abort', onAbort); } catch (_) {} };
      var onAbort = function () { if (!done) { done = true; clean(); reject(abortErr()); } };
      if (sig && typeof sig.addEventListener === 'function') sig.addEventListener('abort', onAbort, { once: true });
      if (ms > 0) timer = setT(function () { if (!done) { done = true; clean(); var e = new Error('The voice took too long to answer.'); e.code = 'timeout'; reject(e); } }, ms);
      Promise.resolve(promise).then(function (v) { if (!done) { done = true; clean(); if (sig && sig.aborted) reject(abortErr()); else resolve(v); } },
        function (err) { if (!done) { done = true; clean(); reject(err); } });
    });
  }

  function get(onProgress) {
    if (ready && usable()) return Promise.resolve(true);
    if (ready) ready = false;
    if (getting) return getting;
    var chain = Promise.resolve();
    VOICE_FILES.forEach(function (src) { chain = chain.then(function () { return addScript(src); }); });
    getting = chain.then(fetchCatalog).then(function (catalog) {
      if (typeof win._alloInstallRuntimeGraphHost !== 'function') throw new Error('The voice could not be started in this browser.');
      if (typeof win.__alloCreateVerifiedWorker !== 'function') win._alloInstallRuntimeGraphHost(catalog, win);
      return addScript(LOADER);
    }).then(function () {
      if (!win._kokoroTTS || typeof win._kokoroTTS.init !== 'function') throw new Error(win.__kokoroTTSUnavailableReason ? 'The voice cannot run in this browser.' : 'The voice could not be started in this browser.');
      return win._kokoroTTS.init(onProgress);
    }).then(function (ok) {
      if (ok === false || !usable()) throw new Error('The voice did not start. Check the connection and try again.');
      ready = true; getting = null; return true;
    }, function (err) { getting = null; throw err; });
    return getting;
  }

  var MAX_WAV_BYTES = 20 * 1024 * 1024;
  function speak(text, voice, options) {
    var o = options || {}, sig = o.signal, ms = Number(o.timeoutMs) > 0 ? Number(o.timeoutMs) : 60000;
    if (!ready || !usable()) return Promise.reject(new Error('The voice is not ready.'));
    if (sig && sig.aborted) return Promise.reject(abortErr());
    return raceWait(Promise.resolve().then(function () {
      return win._kokoroTTS.speak(text, voice || 'af_heart', 1, { word: o.word === true, force: true, signal: sig });
    }), sig, ms).then(function (url) {
      if (sig && sig.aborted) throw abortErr();
      if (!url) { var none = new Error('The voice gave no sound.'); none.code = 'no_sound'; throw none; }
      if (typeof url !== 'string' || !/^(?:blob|data):/i.test(url)) throw badSound();
      if (/^data:/i.test(url)) { var k = kit(), dec = k && k.fromDataUri ? k.fromDataUri(url) : null; if (!dec) throw badSound(); return dec; }
      if (typeof win.fetch !== 'function') throw new Error('The voice audio could not be read.');
      var isReal = !!(sig && win.AbortSignal && sig instanceof win.AbortSignal);
      return raceWait((isReal ? win.fetch(url, { signal: sig }) : win.fetch(url)).then(function (r) {
        if (!r || r.ok === false || typeof r.arrayBuffer !== 'function') throw new Error('The voice audio could not be read.');
        var cl = Number(r.headers && typeof r.headers.get === 'function' ? r.headers.get('content-length') : NaN);
        if (isFinite(cl) && cl > MAX_WAV_BYTES) throw badSound();
        return r.arrayBuffer();
      }), sig, ms).then(function (buf) { return new Uint8Array(buf); });
    }).then(function (bytes) {
      if (sig && sig.aborted) throw abortErr();
      var k = kit(), info = k && k.wavInfo ? k.wavInfo(bytes) : null;
      if (!bytes || bytes.length < 44 || bytes.length > MAX_WAV_BYTES || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== 'RIFF' || String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) !== 'WAVE' || (k && (!info || !(info.size > 0) || !(info.byteRate > 0)))) throw badSound();
      return bytes;
    });
  }

  var need = function (name) { return function () { var k = kit(); if (!k || typeof k[name] !== 'function') throw new Error('The sound helpers did not arrive.'); return k[name].apply(k, arguments); }; };
  var wavInfo = need('wavInfo'), wavMs = need('wavMs'), toDataUri = need('toDataUri'), wavToMp3 = need('wavToMp3');
  function getMp3() {
    var loadKit = kit() ? Promise.resolve() : addScript('packets_audio_kit.js');
    return loadKit.then(function () { return kit() && typeof kit().getMp3 === 'function' ? kit().getMp3() : false; }, function () { return false; });
  }

  win.AlloPacketVoiceEngine = { get: get, isReady: function () { return ready && usable(); }, speak: speak, wavInfo: wavInfo, wavMs: wavMs, toDataUri: toDataUri, getMp3: getMp3, wavToMp3: wavToMp3 };
})((typeof window === 'object' && window !== null) ? window : ((typeof globalThis === 'object' && globalThis !== null) ? globalThis : null));
