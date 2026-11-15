(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root && typeof root === 'object') {
    root.AlloWordAudioShards = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function (root) {
  'use strict';

  var FORMAT = 'alloflow-word-audio-index/1';
  var CDN_BASE = 'https://alloflow-cdn.pages.dev/word_audio_shards/';
  var RELATIVE_BASE = 'word_audio_shards/';
  var FILE_NAME_RE = /^[a-z0-9_][a-z0-9_-]*\.json$/;
  var WORD_RE = /^[a-z][a-z'-]{0,31}$/;
  var AUDIO_DATA_URI_RE = /^data:(audio\/[a-z0-9.+-]+(?:;[a-z0-9=.+-]+)*);base64,([A-Za-z0-9+/=\s]+)$/i;
  var DEFAULT_FAIL_COOLDOWN_MS = 10000;
  var DEFAULT_MAX_SHARDS = 32;
  var DEFAULT_MAX_WAV_ENTRIES = 128;
  var DEFAULT_MAX_BLOB_URLS = 128;
  var DEFAULT_PREFETCH_CONCURRENCY = 4;

  function own(obj, key) {
    return !!(obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key));
  }

  function isPlainObject(val) {
    return !!(val && typeof val === 'object' && !Array.isArray(val));
  }

  function stripBom(text) {
    if (typeof text !== 'string') return '';
    return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  }

  function ensureTrailingSlash(url) {
    if (typeof url !== 'string') return '';
    var trimmed = url.trim();
    if (!trimmed) return '';
    return trimmed.charAt(trimmed.length - 1) === '/' ? trimmed : (trimmed + '/');
  }

  function makeAbortError(message) {
    var err = new Error(message || 'The operation was aborted.');
    err.name = 'AbortError';
    return err;
  }

  function checkNotAborted(signal) {
    if (signal && signal.aborted) {
      throw makeAbortError();
    }
  }

  function raceWithSignal(promise, signal) {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(makeAbortError());
    return new Promise(function (resolve, reject) {
      var settled = false;
      function onAbort() {
        if (settled) return;
        settled = true;
        cleanup();
        reject(makeAbortError());
      }
      function cleanup() {
        if (typeof signal.removeEventListener === 'function') {
          signal.removeEventListener('abort', onAbort);
        }
      }
      if (typeof signal.addEventListener === 'function') {
        signal.addEventListener('abort', onAbort, { once: true });
      }
      Promise.resolve(promise).then(
        function (val) {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(val);
        },
        function (err) {
          if (settled) return;
          settled = true;
          cleanup();
          reject(err);
        }
      );
    });
  }

  function createLruCache(maxEntries, onEvict) {
    var limit = typeof maxEntries === 'number' && maxEntries >= 0 ? Math.floor(maxEntries) : 32;
    var map = new Map();

    function evictOne(key, val) {
      if (typeof onEvict === 'function') {
        try { onEvict(key, val); } catch (_) {}
      }
    }

    return {
      get: function (key) {
        if (!map.has(key)) return undefined;
        var val = map.get(key);
        map.delete(key);
        map.set(key, val);
        return val;
      },
      has: function (key) {
        return map.has(key);
      },
      set: function (key, val) {
        if (limit === 0) {
          if (map.has(key)) {
            var existing = map.get(key);
            map.delete(key);
            if (existing !== val) evictOne(key, existing);
          }
          return val;
        }
        if (map.has(key)) {
          var prev = map.get(key);
          map.delete(key);
          if (prev !== val) evictOne(key, prev);
        } else if (map.size >= limit) {
          var oldestKey = map.keys().next().value;
          var oldestVal = map.get(oldestKey);
          map.delete(oldestKey);
          evictOne(oldestKey, oldestVal);
        }
        map.set(key, val);
        return val;
      },
      clear: function () {
        if (typeof onEvict === 'function') {
          map.forEach(function (val, key) { evictOne(key, val); });
        }
        map.clear();
      },
      size: function () {
        return map.size;
      },
    };
  }

  /**
   * Normalize a candidate lookup word to lowercase dictionary form, or '' if invalid.
   * Rejects multi-word strings and empty inputs.
   */
  function normalizeWord(text, options) {
    if (typeof text !== 'string') return '';
    var stripPunct = !options || options.stripPunctuation !== false;
    var s = text.trim().replace(/[\u2018\u2019]/g, "'");
    if (!s) return '';
    if (stripPunct) {
      s = s.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
    }
    if (!s) return '';
    s = s.toLowerCase();
    return WORD_RE.test(s) ? s : '';
  }

  function isCanvasHost(envRoot) {
    if (!envRoot || !envRoot.location) return false;
    var loc = envRoot.location;
    var href = typeof loc.href === 'string' ? loc.href : '';
    var hostname = typeof loc.hostname === 'string' ? loc.hostname : '';
    if (/^(?:blob:|about:)/i.test(href)) return true;
    if (hostname === 'null') return true;
    return /(?:^|\.)(?:googleusercontent\.com|gstatic\.com|gemini\.google\.com)$/i.test(hostname);
  }

  function deriveCdnShardBase(rawOverride) {
    if (typeof rawOverride !== 'string') return '';
    var base = ensureTrailingSlash(rawOverride);
    if (!base) return '';
    if (/\/word_audio_shards\/$/i.test(base)) return base;
    return base + RELATIVE_BASE;
  }

  /**
   * Resolve candidate base URLs (with trailing slashes) for loading word_audio_shards.
   */
  function resolveBaseUrls(options) {
    var opts = options || {};
    var envRoot = opts.envRoot || root;
    var explicit = opts.baseUrls;
    var out = [];
    var seen = Object.create(null);

    function pushBase(raw) {
      var normalized = ensureTrailingSlash(raw);
      if (normalized && !seen[normalized]) {
        seen[normalized] = true;
        out.push(normalized);
      }
    }

    if (typeof explicit === 'string') {
      pushBase(explicit);
      if (out.length) return out;
    } else if (Array.isArray(explicit) && explicit.length) {
      for (var i = 0; i < explicit.length; i++) pushBase(explicit[i]);
      if (out.length) return out;
    }

    var onCanvas = isCanvasHost(envRoot);
    if (!onCanvas && !opts.cdnOnly) {
      pushBase(opts.relativeBase || RELATIVE_BASE);
    }

    var localOffline = !!(envRoot && envRoot.__ALLO_LOCAL_BOX && opts.offlineOnly);
    if (!localOffline) {
      var overrideBase = envRoot ? deriveCdnShardBase(envRoot._ALLOFLOW_CDN_BASE) : '';
      if (overrideBase) pushBase(overrideBase);
      pushBase(CDN_BASE);
    }

    return out;
  }

  function decodeBase64ToUint8Array(b64) {
    var cleaned = b64.replace(/\s+/g, '');
    if (typeof atob === 'function') {
      var bin = atob(cleaned);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i) & 0xff;
      }
      return bytes;
    }
    if (typeof Buffer === 'function') {
      return new Uint8Array(Buffer.from(cleaned, 'base64'));
    }
    throw new Error('Base64 decoder unavailable.');
  }

  function encodeUint8ArrayToBase64(bytes) {
    if (typeof Buffer === 'function' && typeof btoa !== 'function') {
      return Buffer.from(bytes).toString('base64');
    }
    var chunks = [];
    var step = 0x4000;
    for (var i = 0; i < bytes.length; i += step) {
      var sub = bytes.subarray(i, Math.min(i + step, bytes.length));
      chunks.push(String.fromCharCode.apply(null, sub));
    }
    if (typeof btoa === 'function') {
      return btoa(chunks.join(''));
    }
    return Buffer.from(bytes).toString('base64');
  }

  function parseAudioDataUri(dataUri) {
    if (typeof dataUri !== 'string') return null;
    var m = AUDIO_DATA_URI_RE.exec(dataUri);
    if (!m) return null;
    return {
      mime: m[1].toLowerCase(),
      base64: m[2],
    };
  }

  function writeAscii(view, offset, str) {
    for (var i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i) & 0xff);
    }
  }

  function encodeMonoPcm16Wav(audioBuffer) {
    var sampleRate = Math.max(8000, Math.round(audioBuffer.sampleRate || 24000));
    var numChannels = Math.max(1, audioBuffer.numberOfChannels || 1);
    var length = audioBuffer.length || 0;
    var channels = [];
    for (var ch = 0; ch < numChannels; ch++) {
      channels.push(audioBuffer.getChannelData(ch));
    }

    var dataBytes = length * 2;
    var buf = new ArrayBuffer(44 + dataBytes);
    var view = new DataView(buf);
    writeAscii(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    writeAscii(view, 8, 'WAVE');
    writeAscii(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeAscii(view, 36, 'data');
    view.setUint32(40, dataBytes, true);

    var pos = 44;
    for (var i = 0; i < length; i++) {
      var sum = 0;
      for (var c = 0; c < numChannels; c++) {
        sum += channels[c][i] || 0;
      }
      var sample = Math.max(-1, Math.min(1, sum / numChannels));
      view.setInt16(pos, sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff), true);
      pos += 2;
    }

    return new Uint8Array(buf);
  }

  function defaultCanPlayWebmOpus(envRoot) {
    var AudioCtor = (envRoot && envRoot.Audio) || (typeof Audio === 'function' ? Audio : null);
    if (typeof AudioCtor !== 'function') return true;
    try {
      var probe = new AudioCtor();
      if (!probe || typeof probe.canPlayType !== 'function') return true;
      var support = probe.canPlayType('audio/webm; codecs=opus') || probe.canPlayType('audio/webm');
      return support === 'probably' || support === 'maybe';
    } catch (_) {
      return true;
    }
  }

  function createAudioDecoder(envRoot, customDecoder) {
    if (typeof customDecoder === 'function') {
      return customDecoder;
    }
    return function decodeArrayBuffer(arrayBuf) {
      var OfflineCtx = (envRoot && (envRoot.OfflineAudioContext || envRoot.webkitOfflineAudioContext))
        || (typeof OfflineAudioContext === 'function' ? OfflineAudioContext : null)
        || (typeof webkitOfflineAudioContext === 'function' ? webkitOfflineAudioContext : null);
      if (typeof OfflineCtx === 'function') {
        var offline = new OfflineCtx(1, 1, 24000);
        return offline.decodeAudioData(arrayBuf);
      }
      var AudioCtx = (envRoot && (envRoot.AudioContext || envRoot.webkitAudioContext))
        || (typeof AudioContext === 'function' ? AudioContext : null)
        || (typeof webkitAudioContext === 'function' ? webkitAudioContext : null);
      if (typeof AudioCtx === 'function') {
        var ctx = new AudioCtx();
        return Promise.resolve(ctx.decodeAudioData(arrayBuf)).then(
          function (decoded) {
            if (typeof ctx.close === 'function') {
              try { Promise.resolve(ctx.close()).catch(function () {}); } catch (_) {}
            }
            return decoded;
          },
          function (err) {
            if (typeof ctx.close === 'function') {
              try { Promise.resolve(ctx.close()).catch(function () {}); } catch (_) {}
            }
            throw err;
          }
        );
      }
      return null;
    };
  }

  /**
   * Create a standalone cached client for AlloFlow's 31,973-word sharded Kokoro audio store.
   */
  function createWordAudioShardClient(defaultOptions) {
    var defaults = defaultOptions || {};
    var envRoot = defaults.envRoot || root;
    var failCooldownMs = typeof defaults.failCooldownMs === 'number' && defaults.failCooldownMs >= 0
      ? defaults.failCooldownMs
      : DEFAULT_FAIL_COOLDOWN_MS;

    var indexData = null;
    var inFlightIndex = null;
    var lastIndexFailAt = 0;
    var lastIndexError = null;
    var resolvedIndexBase = '';
    var lastShardError = null;

    var inFlightShards = new Map();
    var shardCache = createLruCache(
      typeof defaults.maxShards === 'number' ? defaults.maxShards : DEFAULT_MAX_SHARDS
    );
    var wavCache = createLruCache(
      typeof defaults.maxWavEntries === 'number' ? defaults.maxWavEntries : DEFAULT_MAX_WAV_ENTRIES
    );

    function revokeBlobUrl(_, url) {
      var urlApi = (envRoot && envRoot.URL) || (typeof URL !== 'undefined' ? URL : null);
      if (urlApi && typeof urlApi.revokeObjectURL === 'function' && typeof url === 'string') {
        try { urlApi.revokeObjectURL(url); } catch (_) {}
      }
    }

    var blobUrlCache = createLruCache(
      typeof defaults.maxBlobUrls === 'number' ? defaults.maxBlobUrls : DEFAULT_MAX_BLOB_URLS,
      revokeBlobUrl
    );

    var counters = {
      shardHits: 0,
      shardMisses: 0,
      shardFetches: 0,
      wavTranscodes: 0,
      blobHits: 0,
    };

    function mergedOpts(options) {
      if (!options) return defaults;
      var out = {};
      var k;
      for (k in defaults) {
        if (own(defaults, k)) out[k] = defaults[k];
      }
      for (k in options) {
        if (own(options, k)) out[k] = options[k];
      }
      return out;
    }

    function getFetch(opts) {
      var f = opts.fetch || (envRoot && envRoot.fetch) || (typeof fetch === 'function' ? fetch : null);
      if (typeof f !== 'function') {
        throw new Error('fetch API is not available.');
      }
      return f;
    }

    async function fetchJsonAcrossBases(relPath, bases, opts, validator, signal) {
      var fetchImpl = getFetch(opts);
      var lastErr = null;
      for (var i = 0; i < bases.length; i++) {
        checkNotAborted(signal);
        var url = bases[i] + relPath;
        try {
          var init = signal ? { signal: signal } : undefined;
          var res = await raceWithSignal(fetchImpl(url, init), signal);
          if (!res || !res.ok) {
            lastErr = new Error('HTTP ' + (res ? res.status : 'error') + ' fetching ' + url);
            continue;
          }
          var parsed;
          if (typeof res.text === 'function') {
            var rawText = await raceWithSignal(res.text(), signal);
            parsed = JSON.parse(stripBom(rawText));
          } else {
            parsed = await raceWithSignal(res.json(), signal);
          }
          if (typeof validator === 'function' && !validator(parsed)) {
            lastErr = new Error('Invalid payload schema from ' + url);
            continue;
          }
          return { data: parsed, base: bases[i] };
        } catch (err) {
          if (err && err.name === 'AbortError') throw err;
          lastErr = err;
        }
      }
      throw lastErr || new Error('No base URLs available for ' + relPath);
    }

    function isValidIndex(data) {
      return isPlainObject(data)
        && data.format === FORMAT
        && isPlainObject(data.words)
        && isPlainObject(data.shards);
    }

    function loadIndex(options) {
      var opts = mergedOpts(options);
      var signal = opts.signal;
      if (signal && signal.aborted) {
        return Promise.reject(makeAbortError());
      }
      var force = Boolean(opts.force);
      var retry = Boolean(opts.retry || force);

      if (indexData && !force) {
        return Promise.resolve(indexData);
      }

      var now = Date.now();
      if (!retry && lastIndexFailAt && (now - lastIndexFailAt) < failCooldownMs && !inFlightIndex) {
        return Promise.resolve(null);
      }

      if (inFlightIndex && !force) {
        return raceWithSignal(inFlightIndex, signal);
      }

      var bases = resolveBaseUrls(opts);
      var reqPromise = (async function () {
        try {
          var result = await fetchJsonAcrossBases('index.json', bases, opts, isValidIndex, signal);
          indexData = result.data;
          resolvedIndexBase = result.base;
          lastIndexFailAt = 0;
          lastIndexError = null;
          return indexData;
        } catch (err) {
          if (err && err.name === 'AbortError') {
            throw err;
          }
          lastIndexFailAt = Date.now();
          lastIndexError = err ? String(err.message || err) : 'Index load failed';
          return null;
        } finally {
          if (inFlightIndex === reqPromise) {
            inFlightIndex = null;
          }
        }
      }());

      inFlightIndex = reqPromise;
      return raceWithSignal(reqPromise, signal);
    }

    function resolveShardFileForWord(word, opts) {
      if (!indexData) return '';
      var norm = normalizeWord(word, opts);
      if (!norm || !own(indexData.words, norm)) return '';
      var shardId = indexData.words[norm];
      if (typeof shardId !== 'string' || !own(indexData.shards, shardId)) return '';
      var meta = indexData.shards[shardId];
      var file = meta && typeof meta.file === 'string' ? meta.file : '';
      return FILE_NAME_RE.test(file) ? file : '';
    }

    function hasWordSync(word, options) {
      if (!indexData) return null;
      return resolveShardFileForWord(word, options || defaults) !== '';
    }

    async function hasWord(word, options) {
      var opts = mergedOpts(options);
      var idx = await loadIndex(opts);
      if (!idx) return false;
      return resolveShardFileForWord(word, opts) !== '';
    }

    async function loadShard(fileName, opts) {
      var signal = opts.signal;
      checkNotAborted(signal);
      if (!FILE_NAME_RE.test(fileName)) return null;

      var cached = shardCache.get(fileName);
      if (cached) {
        counters.shardHits += 1;
        return cached;
      }
      counters.shardMisses += 1;

      if (inFlightShards.has(fileName)) {
        return raceWithSignal(inFlightShards.get(fileName), signal);
      }

      var bases = resolveBaseUrls(opts);
      if (resolvedIndexBase && bases.indexOf(resolvedIndexBase) > 0) {
        bases = [resolvedIndexBase].concat(bases.filter(function (b) { return b !== resolvedIndexBase; }));
      }

      var shardPromise = (async function () {
        counters.shardFetches += 1;
        try {
          var res = await fetchJsonAcrossBases(fileName, bases, opts, isPlainObject, signal);
          lastShardError = null;
          shardCache.set(fileName, res.data);
          return res.data;
        } catch (err) {
          if (err && err.name === 'AbortError') {
            throw err;
          }
          lastShardError = err ? String(err.message || err) : 'Shard load failed';
          return null;
        } finally {
          if (inFlightShards.get(fileName) === shardPromise) {
            inFlightShards.delete(fileName);
          }
        }
      }());

      inFlightShards.set(fileName, shardPromise);
      return raceWithSignal(shardPromise, signal);
    }

    async function transcodeToWavDataUri(normWord, rawUri, opts) {
      var cachedWav = wavCache.get(normWord);
      if (cachedWav) return cachedWav;

      var parsed = parseAudioDataUri(rawUri);
      if (!parsed) return null;
      if (parsed.mime.indexOf('audio/wav') === 0 || parsed.mime.indexOf('audio/x-wav') === 0) {
        wavCache.set(normWord, rawUri);
        return rawUri;
      }

      var decoder = createAudioDecoder(envRoot, opts.decodeAudioData);
      var bytes = decodeBase64ToUint8Array(parsed.base64);
      var arrayBuf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      var maybeDecoded = decoder(arrayBuf);
      if (!maybeDecoded) {
        if (opts.ensureWav) {
          throw new Error('AudioContext/OfflineAudioContext unavailable for WAV transcoding.');
        }
        return rawUri;
      }
      var audioBuffer = await raceWithSignal(Promise.resolve(maybeDecoded), opts.signal);
      checkNotAborted(opts.signal);
      var wavBytes = encodeMonoPcm16Wav(audioBuffer);
      var wavUri = 'data:audio/wav;base64,' + encodeUint8ArrayToBase64(wavBytes);
      counters.wavTranscodes += 1;
      wavCache.set(normWord, wavUri);
      return wavUri;
    }

    function toBlobUrl(cacheKey, dataUri) {
      var cached = blobUrlCache.get(cacheKey);
      if (cached) {
        counters.blobHits += 1;
        return cached;
      }
      var parsed = parseAudioDataUri(dataUri);
      if (!parsed) return null;
      var BlobCtor = (envRoot && envRoot.Blob) || (typeof Blob === 'function' ? Blob : null);
      var urlApi = (envRoot && envRoot.URL) || (typeof URL !== 'undefined' ? URL : null);
      if (typeof BlobCtor !== 'function' || !urlApi || typeof urlApi.createObjectURL !== 'function') {
        throw new Error('Blob URL API is unavailable.');
      }
      var bytes = decodeBase64ToUint8Array(parsed.base64);
      var blob = new BlobCtor([bytes], { type: parsed.mime });
      var blobUrl = urlApi.createObjectURL(blob);
      blobUrlCache.set(cacheKey, blobUrl);
      return blobUrl;
    }

    function shouldConvertToWav(opts) {
      if (opts.ensureWav) return true;
      if (opts.autoWavForSafari === false) return false;
      var checkSupport = typeof opts.canPlayWebmOpus === 'function'
        ? opts.canPlayWebmOpus
        : function () { return defaultCanPlayWebmOpus(envRoot); };
      return !checkSupport();
    }

    async function getWordClip(word, options) {
      var opts = mergedOpts(options);
      var signal = opts.signal;
      checkNotAborted(signal);

      var norm = normalizeWord(word, opts);
      if (!norm) return null;

      var idx = await loadIndex(opts);
      if (!idx) return null;
      checkNotAborted(signal);

      var fileName = resolveShardFileForWord(norm, opts);
      if (!fileName) return null;

      var shard = await loadShard(fileName, opts);
      checkNotAborted(signal);
      if (!shard || !own(shard, norm)) return null;

      var rawUri = shard[norm];
      if (!parseAudioDataUri(rawUri)) return null;

      var finalUri = rawUri;
      var wantWav = shouldConvertToWav(opts);
      if (wantWav) {
        finalUri = await transcodeToWavDataUri(norm, rawUri, opts);
        if (!finalUri) return null;
      }
      checkNotAborted(signal);

      if (opts.asBlobUrl) {
        var blobKey = (finalUri.indexOf('data:audio/wav') === 0 ? 'wav:' : 'raw:') + norm;
        return toBlobUrl(blobKey, finalUri);
      }
      return finalUri;
    }

    async function prefetchWords(words, options) {
      var opts = mergedOpts(options);
      var signal = opts.signal;
      checkNotAborted(signal);

      var list = words ? Array.from(words) : [];
      var idx = await loadIndex(opts);
      if (!idx) {
        return { loaded: 0, missing: list.length, shardsFetched: 0, ok: false };
      }

      var byShard = new Map();
      var missing = 0;
      for (var i = 0; i < list.length; i++) {
        var norm = normalizeWord(list[i], opts);
        var file = norm ? resolveShardFileForWord(norm, opts) : '';
        if (!file) {
          missing += 1;
          continue;
        }
        if (!byShard.has(file)) byShard.set(file, []);
        byShard.get(file).push(norm);
      }

      var files = Array.from(byShard.keys());
      var concurrency = typeof opts.concurrency === 'number' && opts.concurrency >= 1
        ? Math.min(12, Math.floor(opts.concurrency))
        : DEFAULT_PREFETCH_CONCURRENCY;

      var loaded = 0;
      var shardsFetched = 0;
      var cursor = 0;

      async function worker() {
        while (cursor < files.length) {
          checkNotAborted(signal);
          var file = files[cursor++];
          var fetchesBefore = counters.shardFetches;
          var shard = await loadShard(file, opts);
          if (counters.shardFetches > fetchesBefore && shard) shardsFetched += 1;
          var targetWords = byShard.get(file);
          for (var j = 0; j < targetWords.length; j++) {
            var w = targetWords[j];
            if (shard && own(shard, w) && parseAudioDataUri(shard[w])) {
              loaded += 1;
            } else {
              missing += 1;
            }
          }
        }
      }

      var workerCount = Math.min(concurrency, files.length);
      var tasks = [];
      for (var n = 0; n < workerCount; n++) {
        tasks.push(worker());
      }
      await Promise.all(tasks);
      return {
        loaded: loaded,
        missing: missing,
        shardsFetched: shardsFetched,
        totalShardsNeeded: files.length,
        ok: true,
      };
    }

    function clearCache(options) {
      shardCache.clear();
      wavCache.clear();
      blobUrlCache.clear();
      lastIndexFailAt = 0;
      lastIndexError = null;
      lastShardError = null;
      if (options && options.includeIndex) {
        indexData = null;
        inFlightIndex = null;
        resolvedIndexBase = '';
      }
    }

    function stats() {
      return {
        indexLoaded: Boolean(indexData),
        indexedWords: indexData && indexData.words ? Object.keys(indexData.words).length : 0,
        indexedShards: indexData && indexData.shards ? Object.keys(indexData.shards).length : 0,
        resolvedIndexBase: resolvedIndexBase,
        cachedShards: shardCache.size(),
        cachedWavClips: wavCache.size(),
        cachedBlobUrls: blobUrlCache.size(),
        shardHits: counters.shardHits,
        shardMisses: counters.shardMisses,
        shardFetches: counters.shardFetches,
        wavTranscodes: counters.wavTranscodes,
        blobHits: counters.blobHits,
        inFlightShards: inFlightShards.size,
        lastIndexFailAt: lastIndexFailAt,
        lastIndexError: lastIndexError,
        lastShardError: lastShardError,
      };
    }

    return {
      normalizeWord: normalizeWord,
      resolveBaseUrls: function (opts) { return resolveBaseUrls(mergedOpts(opts)); },
      loadIndex: loadIndex,
      hasWordSync: hasWordSync,
      hasWord: hasWord,
      getWordClip: getWordClip,
      prefetchWords: prefetchWords,
      clearCache: clearCache,
      stats: stats,
    };
  }

  return {
    FORMAT: FORMAT,
    CDN_BASE: CDN_BASE,
    RELATIVE_BASE: RELATIVE_BASE,
    normalizeWord: normalizeWord,
    resolveBaseUrls: resolveBaseUrls,
    createWordAudioShardClient: createWordAudioShardClient,
  };
}));
