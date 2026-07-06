(function () {
'use strict';
if (window.AlloModules && window.AlloModules.KaraokeAudioStoreModule) { console.log('[CDN] KaraokeAudioStoreModule already loaded, skipping'); return; }

// ============================================================================
// karaoke_audio_store_module.js (2026-07-06) — durable, teacher-vettable
// read-aloud audio, one sentence at a time.
// ----------------------------------------------------------------------------
// The read-aloud audio is a per-SENTENCE map, not one blob. That single choice
// makes three things fall out for free:
//   • PERSIST  — serialize() the map (base64 MP3) into the resource JSON, so it
//     travels to any student device and plays cold-start-free (no re-synth).
//   • HYDRATE  — on load, rebuild playable blob URLs from that map into memory.
//   • REGENERATE ONE — if a teacher hears a bad sentence, replace just that
//     entry; every other vetted sentence is untouched. Human-in-the-loop, the
//     same posture the rest of the app takes toward AI output.
//
// keyFor() + splitSentences() are the SINGLE SOURCE OF TRUTH for sentence
// identity — the karaoke player and the prep/regenerate flow both go through
// them, so a stored sentence and a requested sentence can never drift apart.
// ============================================================================

  // Normalized key: how a sentence is identified across store, player, and
  // regenerate. Case/whitespace-insensitive so trivial differences collapse.
  function keyFor(sentence) {
    return String(sentence == null ? '' : sentence).toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // Sentence splitter shared with KaraokeReaderOverlay (identical regex) so the
  // prep flow generates exactly the sentences the player will request.
  function splitSentences(text) {
    var cleaned = String(text || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];
    var parts = cleaned.split(/([.!?]+["'”’]?)(\s+|$)/);
    var out = [];
    var buf = '';
    for (var i = 0; i < parts.length; i++) {
      buf += parts[i] || '';
      if ((i % 3) === 2) { var s = buf.trim(); if (s) out.push(s); buf = ''; }
    }
    var tail = buf.trim();
    if (tail) out.push(tail);
    return out.length ? out : [cleaned];
  }

  // base64 (bare or data: URI) → playable blob URL. Guarded so a bad entry
  // can't take down hydration of the rest.
  function b64ToUrl(b64, mime) {
    var clean = String(b64 || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
    if (!clean) return null;
    var bin = atob(clean);
    var len = bin.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime || 'audio/mpeg' }));
  }

  // A per-resource store: sentenceKey → { b64, mime, url }.
  function createStore() {
    var map = new Map();
    var _revoke = function (entry) { if (entry && entry.url) { try { URL.revokeObjectURL(entry.url); } catch (_) {} } };
    return {
      // Playable URL for a sentence, or null if not vetted/stored.
      get: function (sentence) { var e = map.get(keyFor(sentence)); return e ? e.url : null; },
      has: function (sentence) { return map.has(keyFor(sentence)); },
      // Store (or replace) one sentence's audio. Returns the new blob URL.
      put: function (sentence, b64, mime) {
        var k = keyFor(sentence);
        _revoke(map.get(k)); // replacing a bad take frees the old blob
        var url = b64ToUrl(b64, mime);
        if (!url) { map.delete(k); return null; }
        map.set(k, { b64: String(b64 || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, ''), mime: mime || 'audio/mpeg', url: url });
        return url;
      },
      remove: function (sentence) { var k = keyFor(sentence); _revoke(map.get(k)); map.delete(k); },
      size: function () { return map.size; },
      clear: function () { map.forEach(_revoke); map.clear(); },
      // For the prep UI: which of these sentences still need audio.
      missing: function (sentences) {
        var self = this;
        return (Array.isArray(sentences) ? sentences : []).filter(function (s) { return !self.has(s); });
      },
      // → resource JSON. Keyed by normalized sentence so hydrate is exact.
      serialize: function () {
        var sentences = {};
        map.forEach(function (e, k) { sentences[k] = e.b64; });
        return { format: 'mp3', version: 1, sentences: sentences };
      },
      // resource JSON → memory. Returns count hydrated.
      hydrate: function (obj) {
        if (!obj || !obj.sentences || typeof obj.sentences !== 'object') return 0;
        var n = 0;
        var mime = obj.format === 'wav' ? 'audio/wav' : 'audio/mpeg';
        for (var k in obj.sentences) {
          if (!Object.prototype.hasOwnProperty.call(obj.sentences, k)) continue;
          try {
            var url = b64ToUrl(obj.sentences[k], mime);
            if (url) { _revoke(map.get(k)); map.set(k, { b64: String(obj.sentences[k] || ''), mime: mime, url: url }); n++; }
          } catch (_) {}
        }
        return n;
      },
      // Rough embedded size (bytes) for the teacher-facing size estimate.
      estimateBytes: function () {
        var n = 0;
        map.forEach(function (e) { n += e.b64 ? Math.floor(e.b64.length * 3 / 4) : 0; });
        return n;
      }
    };
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.KaraokeAudioStore = {
    keyFor: keyFor,
    splitSentences: splitSentences,
    b64ToUrl: b64ToUrl,
    createStore: createStore,
    // The store for the currently-active resource. ANTI sets this on load /
    // hydrate; the karaoke player reads `current` before falling back to live
    // synthesis. A single well-known slot avoids deep prop-threading.
    current: null
  };
  window.AlloModules.KaraokeAudioStoreModule = true;
  console.log('[KaraokeAudioStore] registered (per-sentence vettable read-aloud: persist + hydrate + regenerate-one)');
})();
