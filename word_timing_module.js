/**
 * AlloFlow Word Timing Module
 *
 * Deterministic per-word timing estimation for karaoke word-by-word
 * highlighting. No models, no network: an O(n) RMS envelope over the decoded
 * audio + syllable/punctuation-weighted proportional allocation, with word
 * boundaries SNAPPED to the nearest low-energy valley. TTS speech (evenly
 * paced, cleanly articulated) is the best case for this estimator; typical
 * boundary error is well under the ~200ms a reader following a highlight can
 * perceive. It is an ESTIMATE — right for follow-along highlighting, never
 * for fluency measurement.
 *
 * The token/weight model here MUST stay rule-identical to the karaoke
 * overlay's inline fallback (immersive_reader_source renderSentence): the
 * overlay maps sweep percentage → per-word fill through these same weights,
 * so both sides sharing tokenWeights() is what keeps audio-derived timings
 * and painted words aligned.
 */
(function () {
  'use strict';
  var _win = (typeof window !== 'undefined' && window && (typeof window === 'object' || typeof window === 'function')) ? window : null;
  if (_win && _win.AlloModules && typeof _win.AlloModules === 'object' && _win.AlloModules.WordTiming) {
    if (typeof console !== 'undefined' && console && typeof console.log === 'function') {
      console.log('[WordTiming] Already loaded, skipping');
    }
    return;
  }

  var MAX_SENTENCE_CHARS = 50000;
  var MAX_AUDIO_SAMPLES = 48000 * 120;
  var MAX_AUDIO_BYTES = 25 * 1024 * 1024;
  var MIN_SAMPLE_RATE = 100;
  var MAX_SAMPLE_RATE = 384000;

  function _safeStr(v) {
    if (v == null || typeof v === 'symbol') return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
    if (typeof v === 'boolean') return String(v);
    try { return String(v); } catch (_) { return ''; }
  }

  function _safeNum(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.trim() !== '') return Number(v);
    return NaN;
  }

  // ── Tokenization + weights (single source of truth) ──
  function tokenize(sentence) {
    return _safeStr(sentence).slice(0, MAX_SENTENCE_CHARS).split(/(\s+)/);
  }

  function pauseBonus(word) {
    var tail = _safeStr(word).replace(/["'”’\)\]]*$/, '').slice(-1);
    if (/[.!?]/.test(tail)) return 5;   // sentence-ending: longest rest
    if (/[,;:]/.test(tail)) return 3;   // clause break
    if (/[—–]/.test(tail)) return 3;    // dash
    return 0;
  }

  function tokenWeights(sentence) {
    var parts = tokenize(sentence);
    var prevWord = '';
    var weights = parts.map(function (part) {
      if (/^\s+$/.test(part)) return part.length + pauseBonus(prevWord);
      if (part !== '') prevWord = part;
      return part.length;
    });
    var totalWeight = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
    return { parts: parts, weights: weights, totalWeight: totalWeight };
  }

  // ── Envelope analysis ──
  var FRAME_MS = 20;
  var HOP_MS = 10;
  var SNAP_WINDOW_MS = 140;
  var MIN_PART_MS = 40;

  function rmsEnvelope(channelData, sampleRate) {
    var rate = _safeNum(sampleRate);
    if (!channelData || !Number.isFinite(rate) || rate < MIN_SAMPLE_RATE || rate > MAX_SAMPLE_RATE) {
      return { frames: [0], hopMs: HOP_MS };
    }
    var rawLen = _safeNum(channelData.length);
    var len = (Number.isFinite(rawLen) && rawLen > 0) ? Math.min(Math.floor(rawLen), MAX_AUDIO_SAMPLES) : 0;
    var frame = Math.max(1, Math.round(rate * FRAME_MS / 1000));
    var hop = Math.max(1, Math.round(rate * HOP_MS / 1000));
    var frames = [];
    for (var start = 0; start + frame <= len; start += hop) {
      var sum = 0;
      for (var i = start; i < start + frame; i++) {
        var sample = channelData[i];
        if (typeof sample === 'number' && Number.isFinite(sample)) {
          var clamped = sample > 1e100 ? 1e100 : (sample < -1e100 ? -1e100 : sample);
          sum += clamped * clamped;
        }
      }
      frames.push(Math.sqrt(sum / frame));
    }
    if (!frames.length) frames.push(0);
    // 3-frame moving average keeps plosive dips from reading as gaps.
    var smooth = frames.map(function (value, index) {
      var prev = frames[index - 1] != null ? frames[index - 1] : value;
      var next = frames[index + 1] != null ? frames[index + 1] : value;
      return (prev + value + next) / 3;
    });
    return { frames: smooth, hopMs: (hop / rate) * 1000 };
  }

  function percentile(sortedAscending, fraction) {
    if (!sortedAscending.length) return 0;
    var index = Math.min(sortedAscending.length - 1, Math.max(0, Math.round(fraction * (sortedAscending.length - 1))));
    return sortedAscending[index];
  }

  function speechBounds(envelope) {
    var sorted = envelope.frames.slice().sort(function (a, b) { return a - b; });
    var floor = 0.1 * percentile(sorted, 0.95);
    var first = -1;
    var last = -1;
    envelope.frames.forEach(function (value, index) {
      if (value > floor) { if (first === -1) first = index; last = index; }
    });
    if (first === -1) { first = 0; last = envelope.frames.length - 1; }
    return {
      floor: floor,
      startMs: first * envelope.hopMs,
      endMs: (last + 1) * envelope.hopMs,
    };
  }

  function snapToValley(envelope, timeMs, windowMs) {
    if (!envelope || !(envelope.hopMs > 0) || !Array.isArray(envelope.frames) || !envelope.frames.length) return timeMs;
    var center = Math.round(timeMs / envelope.hopMs);
    var radius = Math.max(1, Math.round(windowMs / envelope.hopMs));
    var bestIndex = Math.max(0, Math.min(envelope.frames.length - 1, center));
    var bestValue = Infinity;
    for (var i = center - radius; i <= center + radius; i++) {
      if (i < 0 || i >= envelope.frames.length) continue;
      if (envelope.frames[i] < bestValue) { bestValue = envelope.frames[i]; bestIndex = i; }
    }
    return bestIndex * envelope.hopMs;
  }

  // ── Mapping construction ──
  // A mapping carries, per token (word AND whitespace gap), its [startMs,
  // endMs) on the clip timeline, provisioned proportionally over the SPEECH
  // region and snapped to energy valleys at word→gap edges.
  function buildMapping(sentence, boundsStartMs, boundsEndMs, envelope) {
    var model = tokenWeights(sentence);
    var speechMs = Math.max(1, boundsEndMs - boundsStartMs);
    var times = [boundsStartMs];
    var cum = 0;
    for (var i = 0; i < model.parts.length; i++) {
      cum += model.weights[i];
      var provisional = boundsStartMs + (cum / model.totalWeight) * speechMs;
      var isWord = !/^\s+$/.test(model.parts[i]) && model.parts[i] !== '';
      var followedByGap = i + 1 < model.parts.length && /^\s+$/.test(model.parts[i + 1]);
      var rawSnapped = (envelope && isWord && followedByGap)
        ? snapToValley(envelope, provisional, SNAP_WINDOW_MS)
        : provisional;
      var snapped = Math.min(boundsEndMs, Math.max(boundsStartMs, rawSnapped));
      var floor = times[times.length - 1] + (model.weights[i] > 0 ? MIN_PART_MS : 0);
      times.push(Math.max(snapped, Math.min(floor, boundsEndMs)));
    }
    times[times.length - 1] = Math.max(times[times.length - 1], boundsEndMs);
    return {
      parts: model.parts,
      weights: model.weights,
      totalWeight: model.totalWeight,
      boundaryMs: times, // length = parts.length + 1
      speechStartMs: boundsStartMs,
      speechEndMs: boundsEndMs,
    };
  }

  function estimateFromChannel(input) {
    var channelData = input && input.channelData;
    var sampleRate = _safeNum(input && input.sampleRate);
    var sentence = input && input.sentence;
    var chLen = channelData ? _safeNum(channelData.length) : 0;
    if (!channelData || !(chLen > 0) || !Number.isFinite(sampleRate) || sampleRate < MIN_SAMPLE_RATE || sampleRate > MAX_SAMPLE_RATE || typeof sentence !== 'string' || !sentence) return null;
    var envelope = rmsEnvelope(channelData, sampleRate);
    var bounds = speechBounds(envelope);
    return buildMapping(sentence, bounds.startMs, bounds.endMs, envelope);
  }

  function proportionalMapping(sentence, totalMs) {
    var ms = _safeNum(totalMs);
    if (typeof sentence !== 'string' || !sentence || !Number.isFinite(ms) || !(ms > 0)) return null;
    return buildMapping(sentence, 0, ms, null);
  }

  // ── Time → sweep percentage (drives the overlay's existing word fill) ──
  function weightPctAtTime(mapping, seconds) {
    if (
      !mapping ||
      !Array.isArray(mapping.boundaryMs) ||
      !Array.isArray(mapping.parts) ||
      !Array.isArray(mapping.weights) ||
      !Number.isFinite(mapping.totalWeight) ||
      !(mapping.totalWeight > 0) ||
      mapping.parts.length === 0 ||
      mapping.boundaryMs.length < mapping.parts.length + 1 ||
      mapping.weights.length < mapping.parts.length
    ) return 0;
    var sec = _safeNum(seconds);
    if (!Number.isFinite(sec) || sec <= 0) return 0;
    var timeMs = sec * 1000;
    var firstBoundary = _safeNum(mapping.boundaryMs[0]);
    var lastBoundary = _safeNum(mapping.boundaryMs[mapping.parts.length]);
    if (!Number.isFinite(firstBoundary) || !Number.isFinite(lastBoundary)) return 0;
    if (timeMs <= firstBoundary) return 0;
    if (timeMs >= lastBoundary) return 100;
    var cum = 0;
    for (var i = 0; i < mapping.parts.length; i++) {
      var start = _safeNum(mapping.boundaryMs[i]);
      var end = _safeNum(mapping.boundaryMs[i + 1]);
      var w = _safeNum(mapping.weights[i]);
      if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(w) || w < 0) return 0;
      if (timeMs < end) {
        var frac = end > start ? Math.max(0, Math.min(1, (timeMs - start) / (end - start))) : 1;
        var pct = ((cum + frac * w) / mapping.totalWeight) * 100;
        return Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
      }
      cum += w;
    }
    return 100;
  }

  // ── Char index → sweep percentage (Web Speech boundary events) ──
  // speechSynthesis boundary events report the character index of the word
  // ABOUT TO BE spoken — the fill should sit at the cumulative weight before
  // that token.
  function weightPctAtCharIndex(sentence, charIndex) {
    var model = tokenWeights(sentence);
    var rawIdx = _safeNum(charIndex);
    var index = Number.isFinite(rawIdx) ? Math.max(0, rawIdx) : (rawIdx === Infinity ? Infinity : 0);
    var chars = 0;
    var cum = 0;
    for (var i = 0; i < model.parts.length; i++) {
      var next = chars + model.parts[i].length;
      if (index < next) break;
      chars = next;
      cum += model.weights[i];
    }
    return Math.max(0, Math.min(100, (cum / model.totalWeight) * 100));
  }

  function hashSentence(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16);
  }

  function isSafeAudioUrl(raw) {
    if (typeof raw !== 'string') return false;
    var trimmed = raw.trim();
    if (!trimmed || trimmed.length > 2000000) return false;
    if (/^blob:/i.test(trimmed)) return true;
    if (/^data:audio\/[a-z0-9.+-]+(?:;[^,]*)?;base64,/i.test(trimmed)) return true;
    try {
      if (_win) {
        var qr = _win.__alloQrStudentMode;
        if (_win.__alloOfflineOnly === true || _win._alloQrBlocked === true || qr === true || (qr && typeof qr === 'object' && qr.active === true)) {
          return false;
        }
      }
      var loc = _win && _win.location;
      var base = (loc && typeof loc.href === 'string' && loc.href) ? loc.href : 'https://localhost/';
      var parsed = new URL(trimmed, base);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      if (loc && typeof loc.origin === 'string' && loc.origin) {
        if (loc.origin === 'null') return false;
        return parsed.origin === loc.origin;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  // ── URL → mapping with a bounded session cache ──
  var _cache = new Map();
  var _inFlight = new Map();
  var CACHE_MAX = 120;
  var _audioContext = null;
  function audioContext() {
    if (_audioContext && _audioContext.state !== 'closed') return _audioContext;
    var Ctor = (_win && (_win.AudioContext || _win.webkitAudioContext)) || (typeof AudioContext === 'function' ? AudioContext : null);
    if (!Ctor) return null;
    try { _audioContext = new Ctor(); } catch (e) { return null; }
    return _audioContext;
  }

  function freezeMapping(mapping) {
    if (!mapping || typeof mapping !== 'object') return mapping;
    Object.freeze(mapping.parts);
    Object.freeze(mapping.weights);
    Object.freeze(mapping.boundaryMs);
    return Object.freeze(mapping);
  }

  function decodeAudioSafely(context, buffer, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (!settled) {
          settled = true;
          reject(new Error('Audio decode timed out'));
        }
      }, timeoutMs || 10000);
      function finish(fn, val) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn(val);
      }
      try {
        // Support both callback form (older Safari) and Promise return form.
        var ret = context.decodeAudioData(
          buffer.slice(0),
          function (decoded) { finish(resolve, decoded); },
          function (err) { finish(reject, err || new Error('decodeAudioData failed')); }
        );
        if (ret && typeof ret.then === 'function') {
          ret.then(
            function (decoded) { finish(resolve, decoded); },
            function (err) { finish(reject, err); }
          );
        }
      } catch (err) {
        finish(reject, err);
      }
    });
  }

  function timingsForUrl(url, sentence, options) {
    if (!url || typeof sentence !== 'string' || !sentence) return Promise.resolve(null);
    if (!isSafeAudioUrl(url)) return Promise.resolve(null);
    var boundedSentence = sentence.slice(0, MAX_SENTENCE_CHARS);
    var key = hashSentence(url) + '␟' + url.length + '␟' + url.slice(0, 64) + '␟' + boundedSentence.length + '␟' + hashSentence(boundedSentence);
    if (_cache.has(key)) {
      var hit = _cache.get(key);
      _cache.delete(key);
      _cache.set(key, hit);
      return Promise.resolve(hit);
    }
    if (_inFlight.has(key)) return _inFlight.get(key);
    if (_inFlight.size >= 64) return Promise.resolve(null);
    var context = (options && options.audioContext) || audioContext();
    var fetchImpl = (_win && typeof _win.fetch === 'function') ? _win.fetch : (typeof fetch === 'function' ? fetch : null);
    if (!context || !fetchImpl) return Promise.resolve(null);
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (_) {} }, 10000) : null;
    var fetchInit = { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', redirect: 'error' };
    if (ctrl) fetchInit.signal = ctrl.signal;
    var req = fetchImpl(url, fetchInit)
      .then(function (response) {
        if (!response || !response.ok) throw new Error('HTTP ' + (response ? response.status : 'error'));
        var lenHdr = _safeNum(response.headers && response.headers.get && response.headers.get('content-length'));
        if (Number.isFinite(lenHdr) && lenHdr > MAX_AUDIO_BYTES) throw new Error('Audio exceeds size budget');
        return response.arrayBuffer();
      })
      .then(function (buffer) {
        if (!buffer || buffer.byteLength > MAX_AUDIO_BYTES) throw new Error('Audio exceeds size budget');
        return decodeAudioSafely(context, buffer, 10000);
      })
      .then(function (decoded) {
        if (!decoded || typeof decoded.getChannelData !== 'function') return null;
        if (typeof decoded.numberOfChannels === 'number' && decoded.numberOfChannels < 1) return null;
        var mapping = estimateFromChannel({
          channelData: decoded.getChannelData(0),
          sampleRate: decoded.sampleRate,
          sentence: boundedSentence,
        });
        if (mapping) {
          freezeMapping(mapping);
          _cache.set(key, mapping);
          while (_cache.size > CACHE_MAX) _cache.delete(_cache.keys().next().value);
        }
        return mapping;
      })
      .catch(function () { return null; })
      .finally(function () {
        if (timer) clearTimeout(timer);
        if (_inFlight.get(key) === req) _inFlight.delete(key);
      });
    _inFlight.set(key, req);
    return req;
  }

  var WordTimingAPI = Object.freeze({
    tokenize: tokenize,
    tokenWeights: tokenWeights,
    pauseBonus: pauseBonus,
    estimateFromChannel: estimateFromChannel,
    proportionalMapping: proportionalMapping,
    weightPctAtTime: weightPctAtTime,
    weightPctAtCharIndex: weightPctAtCharIndex,
    timingsForUrl: timingsForUrl,
  });
  if (typeof module === 'object' && module && module.exports) module.exports = WordTimingAPI;
  if (_win) {
    try {
      if (!_win.AlloModules || typeof _win.AlloModules !== 'object') _win.AlloModules = {};
      _win.AlloModules.WordTiming = WordTimingAPI;
      _win.AlloModules.WordTimingModule = true;
      if (typeof console !== 'undefined' && console && typeof console.log === 'function') {
        console.log('[WordTiming] registered (deterministic per-word karaoke timing)');
      }
    } catch (_) {}
  }
})();
