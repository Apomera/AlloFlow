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
  if (window.AlloModules && window.AlloModules.WordTiming) {
    console.log('[WordTiming] Already loaded, skipping');
    return;
  }

  // ── Tokenization + weights (single source of truth) ──
  function tokenize(sentence) {
    return String(sentence == null ? '' : sentence).split(/(\s+)/);
  }

  function pauseBonus(word) {
    var tail = String(word).replace(/["'”’\)\]]*$/, '').slice(-1);
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
    var frame = Math.max(1, Math.round(sampleRate * FRAME_MS / 1000));
    var hop = Math.max(1, Math.round(sampleRate * HOP_MS / 1000));
    var frames = [];
    for (var start = 0; start + frame <= channelData.length; start += hop) {
      var sum = 0;
      for (var i = start; i < start + frame; i++) sum += channelData[i] * channelData[i];
      frames.push(Math.sqrt(sum / frame));
    }
    if (!frames.length) frames.push(0);
    // 3-frame moving average keeps plosive dips from reading as gaps.
    var smooth = frames.map(function (value, index) {
      var prev = frames[index - 1] != null ? frames[index - 1] : value;
      var next = frames[index + 1] != null ? frames[index + 1] : value;
      return (prev + value + next) / 3;
    });
    return { frames: smooth, hopMs: (hop / sampleRate) * 1000 };
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
    var center = Math.round(timeMs / envelope.hopMs);
    var radius = Math.max(1, Math.round(windowMs / envelope.hopMs));
    var bestIndex = center;
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
      var snapped = (envelope && isWord && followedByGap)
        ? snapToValley(envelope, provisional, SNAP_WINDOW_MS)
        : provisional;
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
    var sampleRate = input && input.sampleRate;
    var sentence = input && input.sentence;
    if (!channelData || !channelData.length || !sampleRate || !sentence) return null;
    var envelope = rmsEnvelope(channelData, sampleRate);
    var bounds = speechBounds(envelope);
    return buildMapping(sentence, bounds.startMs, bounds.endMs, envelope);
  }

  function proportionalMapping(sentence, totalMs) {
    if (!sentence || !(totalMs > 0)) return null;
    return buildMapping(sentence, 0, totalMs, null);
  }

  // ── Time → sweep percentage (drives the overlay's existing word fill) ──
  function weightPctAtTime(mapping, seconds) {
    if (!mapping || !Array.isArray(mapping.boundaryMs)) return 0;
    var timeMs = Math.max(0, Number(seconds) * 1000);
    if (timeMs <= mapping.boundaryMs[0]) return 0;
    var lastIndex = mapping.boundaryMs.length - 1;
    if (timeMs >= mapping.boundaryMs[lastIndex]) return 100;
    var cum = 0;
    for (var i = 0; i < mapping.parts.length; i++) {
      var start = mapping.boundaryMs[i];
      var end = mapping.boundaryMs[i + 1];
      if (timeMs < end) {
        var frac = end > start ? (timeMs - start) / (end - start) : 1;
        return Math.max(0, Math.min(100, ((cum + frac * mapping.weights[i]) / mapping.totalWeight) * 100));
      }
      cum += mapping.weights[i];
    }
    return 100;
  }

  // ── Char index → sweep percentage (Web Speech boundary events) ──
  // speechSynthesis boundary events report the character index of the word
  // ABOUT TO BE spoken — the fill should sit at the cumulative weight before
  // that token.
  function weightPctAtCharIndex(sentence, charIndex) {
    var model = tokenWeights(sentence);
    var index = Math.max(0, Number(charIndex) || 0);
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

  // ── URL → mapping with a bounded session cache ──
  var _cache = new Map();
  var CACHE_MAX = 120;
  var _audioContext = null;
  function audioContext() {
    if (_audioContext) return _audioContext;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try { _audioContext = new Ctor(); } catch (e) { return null; }
    return _audioContext;
  }

  function timingsForUrl(url, sentence, options) {
    if (!url || !sentence) return Promise.resolve(null);
    var key = url + '␟' + sentence.length;
    if (_cache.has(key)) return Promise.resolve(_cache.get(key));
    var context = (options && options.audioContext) || audioContext();
    if (!context || typeof fetch !== 'function') return Promise.resolve(null);
    return fetch(url)
      .then(function (response) { return response.arrayBuffer(); })
      .then(function (buffer) {
        return new Promise(function (resolve, reject) {
          // Callback form: Safari's decodeAudioData promise support lags.
          context.decodeAudioData(buffer.slice(0), resolve, reject);
        });
      })
      .then(function (decoded) {
        var mapping = estimateFromChannel({
          channelData: decoded.getChannelData(0),
          sampleRate: decoded.sampleRate,
          sentence: sentence,
        });
        _cache.set(key, mapping);
        while (_cache.size > CACHE_MAX) _cache.delete(_cache.keys().next().value);
        return mapping;
      })
      .catch(function () { return null; });
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.WordTiming = {
    tokenize: tokenize,
    tokenWeights: tokenWeights,
    pauseBonus: pauseBonus,
    estimateFromChannel: estimateFromChannel,
    proportionalMapping: proportionalMapping,
    weightPctAtTime: weightPctAtTime,
    weightPctAtCharIndex: weightPctAtCharIndex,
    timingsForUrl: timingsForUrl,
  };
  window.AlloModules.WordTimingModule = true;
  console.log('[WordTiming] registered (deterministic per-word karaoke timing)');
})();
