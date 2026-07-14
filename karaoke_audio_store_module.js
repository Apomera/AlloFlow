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
  // ALSO punctuation-spacing-insensitive (2026-07-09): the karaoke overlay
  // rebuilds its text from immersiveData word/punct TOKENS joined with
  // spaces ("The sun is hot ."), while the leveled-text/FAQ views key off
  // the raw resource text ("The sun is hot."). Every rule below is applied
  // to BOTH the writer's and the reader's sentence, so the two spellings
  // converge on one key and prepped audio serves every surface. Collisions
  // (two sentences normalizing identically) just share a clip — harmless.
  function keyFor(sentence) {
    return String(sentence == null ? '' : sentence).toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/([a-z0-9À-ÿ])\s*'\s*([a-z0-9À-ÿ])/g, "$1'$2")
      .replace(/([0-9])\s*\.\s*([0-9])/g, '$1.$2')
      .replace(/\s+([.,!?;:%)\]}…])/g, '$1')
      .replace(/([([{])\s+/g, '$1')
      .replace(/\s*"\s*/g, '"')
      .replace(/([a-z0-9À-ÿ])\s*-\s*([a-z0-9À-ÿ])/g, '$1-$2')
      .replace(/\s*—\s*/g, '—')
      .replace(/\s+/g, ' ').trim();
  }

  // Sentence splitter shared with KaraokeReaderOverlay so the prep flow
  // generates exactly the sentences the player will request. When the app's
  // canonical splitter (PureHelpers.splitTextToSentences — the one handleSpeak
  // and the leveled-text/FAQ views use) is loaded, DELEGATE to it so overlay
  // and view sentence BOUNDARIES agree too (honorifics like "Dr.", links,
  // LaTeX); the inline regex below stays as the standalone fallback.
  function splitSentences(text) {
    var cleaned = String(text || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];
    try {
      var PH = window.AlloModules && window.AlloModules.PureHelpers;
      if (PH && typeof PH.splitTextToSentences === 'function') {
        var viaApp = PH.splitTextToSentences(cleaned, {});
        if (Array.isArray(viaApp) && viaApp.length) return viaApp;
      }
    } catch (_) {}
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
      // Store (or replace) one sentence's audio. `source` records provenance
      // by construction — 'ai' (default), 'human-teacher', 'human-student', etc.
      // — so the UI can honestly show whose voice a student hears. Returns the
      // new blob URL.
      put: function (sentence, b64, mime, source) {
        var k = keyFor(sentence);
        _revoke(map.get(k)); // replacing a bad take frees the old blob
        var url = b64ToUrl(b64, mime);
        if (!url) { map.delete(k); return null; }
        map.set(k, { b64: String(b64 || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, ''), mime: mime || 'audio/mpeg', url: url, source: source || 'ai' });
        return url;
      },
      // Provenance of a stored sentence ('ai' | 'human-teacher' | ...) or null.
      sourceOf: function (sentence) { var e = map.get(keyFor(sentence)); return e ? (e.source || 'ai') : null; },
      remove: function (sentence) { var k = keyFor(sentence); _revoke(map.get(k)); map.delete(k); },
      size: function () { return map.size; },
      clear: function () { map.forEach(_revoke); map.clear(); },
      // For the prep UI: which of these sentences still need audio.
      missing: function (sentences) {
        var self = this;
        return (Array.isArray(sentences) ? sentences : []).filter(function (s) { return !self.has(s); });
      },
      // → resource JSON. Per-entry mime (v2) so a resource can mix cloud-MP3
      // and keyless-WAV takes and still hydrate each correctly. v1 payloads
      // (single top-level format, no mimes) still hydrate via the fallback.
      serialize: function () {
        var sentences = {};
        var mimes = {};
        var sources = {};
        map.forEach(function (e, k) { sentences[k] = e.b64; mimes[k] = e.mime || 'audio/mpeg'; sources[k] = e.source || 'ai'; });
        return { format: 'per-entry', version: 2, sentences: sentences, mimes: mimes, sources: sources };
      },
      // resource JSON → memory. Returns count hydrated. Keys are re-run
      // through keyFor so payloads saved under an older normalization
      // (e.g. pre-punctuation-spacing keys from the overlay) migrate to
      // the current key space on load instead of being orphaned.
      hydrate: function (obj) {
        if (!obj || !obj.sentences || typeof obj.sentences !== 'object') return 0;
        var n = 0;
        var mimes = (obj.mimes && typeof obj.mimes === 'object') ? obj.mimes : {};
        var sources = (obj.sources && typeof obj.sources === 'object') ? obj.sources : {};
        var fallbackMime = obj.format === 'wav' ? 'audio/wav' : 'audio/mpeg';
        for (var k in obj.sentences) {
          if (!Object.prototype.hasOwnProperty.call(obj.sentences, k)) continue;
          try {
            var kk = keyFor(k);
            if (!kk) continue;
            // Never let a stale-keyed AI clip overwrite a human take that
            // normalized onto the same key.
            var existing = map.get(kk);
            if (existing && String(existing.source || '').indexOf('human') === 0 && String(sources[k] || 'ai').indexOf('human') !== 0) continue;
            var mime = mimes[k] || fallbackMime;
            var url = b64ToUrl(obj.sentences[k], mime);
            if (url) { _revoke(existing); map.set(kk, { b64: String(obj.sentences[k] || ''), mime: mime, url: url, source: sources[k] || 'ai' }); n++; }
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
    // Two parallel lanes for the active resource, both keyed by sentence:
    //  • current        = the MODEL/reference read-aloud (AI takes + the
    //    teacher's recorded reference). This is what karaoke plays by default.
    //  • studentCurrent = the STUDENT's own practice recordings. Kept entirely
    //    separate so a student's take NEVER overwrites the teacher reference —
    //    the student can always fall back to the teacher's version when stuck.
    // Sharing is teacher→student→teacher only (never student→student), so each
    // student's lane lives in their own copy; no contention.
    current: null,
    studentCurrent: null
  };
  window.AlloModules.KaraokeAudioStoreModule = true;
  console.log('[KaraokeAudioStore] registered (per-sentence vettable read-aloud: persist + hydrate + regenerate-one)');
})();
