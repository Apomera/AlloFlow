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
      // Markdown decoration is display-only (2026-07-16): the SPOKEN spelling
      // has it stripped (phase_k sanitizeTtsText / view cleanSentenceForAudio)
      // while list/lookup spellings can still carry it raw ("## Title",
      // "**word**"). Strip it here so both spellings of the same sentence
      // converge on one key — the same contract as the punctuation rules
      // below. Mirrors the sanitizer's decoration rules exactly.
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/\[?⁽[⁰¹²³⁴-⁹]+⁾\]?/g, '')
      .replace(/\[source\s+\d+\]/g, '')
      .replace(/\[\d+\]/g, '')
      .replace(/^[ \t]*#{1,6}[ \t]+/, '')
      .replace(/^[ \t]*>[ \t]?/, '')
      .replace(/^[ \t]*[-*+][ \t]+/, '')
      .replace(/^[ \t]*\d+\.[ \t]+/, '')
      .replace(/[*_~`]+/g, '')
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
  //
  // ⚠ INVARIANT (2026-07-16): the boundaries this function produces MUST match
  // the playback path (phase_k handleSpeak/playSequence, which splits with
  // splitTextToSentences — terminators plus heading-line/blank-line
  // boundaries; never at other single line breaks or length caps).
  // Store keys are derived from these units on BOTH sides. A 2026-07-15 change
  // exported a line-splitting + 120-char-capping variant here WITHOUT changing
  // playback: every Save-TTS/captured clip was then keyed differently from
  // what playback and Edit Audio requested — prepped audio stopped serving
  // playback (startup latency returned) and capture-as-you-play never showed
  // up in edit mode. Kokoro's long-text truncation, the cap's motivation, is
  // fixed at the callTTS layer instead (kokoro speak() returns the COMPLETE
  // clip regardless of length), so no cap belongs here.
  function splitSentences(text) {
    var raw = String(text || '').replace(/<[^>]*>/g, '');
    if (!raw.trim()) return [];
    try {
      var PH = window.AlloModules && window.AlloModules.PureHelpers;
      if (PH && typeof PH.splitTextToSentences === 'function') {
        // Newlines pass through UNCOLLAPSED (2026-07-16): the canonical
        // splitter treats heading lines and blank lines as hard unit
        // boundaries, so flattening "\n" to " " here would rebuild the very
        // divergence this delegation exists to prevent ("## Title\nBody"
        // merging into one unit on this side but not in playback).
        var viaApp = PH.splitTextToSentences(raw, {});
        if (Array.isArray(viaApp) && viaApp.length) return viaApp;
      }
    } catch (_) {}
    var cleaned = raw.replace(/\s+/g, ' ').trim();
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

  // Keep embedded read-aloud data bounded. At 64 kbps, 12 MiB is roughly
  // twenty-five minutes of speech; the per-clip limit still permits unusually
  // long paragraphs while rejecting accidental full-recording payloads.
  var DEFAULT_MAX_BYTES = 12 * 1024 * 1024;
  var DEFAULT_MAX_CLIP_BYTES = 2 * 1024 * 1024;
  function cleanBase64(b64) {
    return String(b64 || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
  }
  function base64ByteLength(b64) {
    var clean = cleanBase64(b64);
    if (!clean) return 0;
    var padding = clean.endsWith('==') ? 2 : (clean.endsWith('=') ? 1 : 0);
    return Math.max(0, Math.floor(clean.length * 3 / 4) - padding);
  }
  function normalizeMetadata(meta) {
    if (!meta || typeof meta !== 'object') return null;
    var out = {};
    ['voice', 'language', 'provider', 'createdAt'].forEach(function (key) {
      if (meta[key] != null && String(meta[key]).trim()) out[key] = String(meta[key]).slice(0, 160);
    });
    var speed = Number(meta.speed);
    if (isFinite(speed) && speed > 0 && speed <= 4) out.speed = speed;
    var voiceResolverVersion = Number(meta.voiceResolverVersion);
    if (isFinite(voiceResolverVersion) && voiceResolverVersion > 0) out.voiceResolverVersion = voiceResolverVersion;
    if (!out.createdAt) out.createdAt = new Date().toISOString();
    return out;
  }

  // V4 identity is resource-agnostic. The controller owns one store per
  // resource; this portable identity only locates a segment inside that store.
  function isIdentityTarget(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function normalizeIdentity(value) {
    if (!isIdentityTarget(value)) return null;
    var identityVersion = Number(value.identityVersion == null ? 4 : value.identityVersion);
    if (identityVersion !== 4) return null;
    var adapterId = String(value.adapterId || '').trim().slice(0, 160);
    var scopeId = String(value.scopeId == null ? 'main' : value.scopeId).trim().slice(0, 240);
    var segmentId = String(value.segmentId || '').trim().slice(0, 240);
    var spokenText = String(value.spokenText == null ? '' : value.spokenText).trim();
    if (!adapterId || !scopeId || !segmentId || !spokenText) return null;
    var adapterVersion = Number(value.adapterVersion == null ? 1 : value.adapterVersion);
    if (!isFinite(adapterVersion) || adapterVersion <= 0) adapterVersion = 1;
    var spokenFingerprint = String(value.spokenFingerprint == null ? '' : value.spokenFingerprint).trim().slice(0, 240);
    if (!spokenFingerprint) spokenFingerprint = keyFor(spokenText);
    return {
      identityVersion: 4,
      adapterId: adapterId,
      adapterVersion: adapterVersion,
      scopeId: scopeId,
      segmentId: segmentId,
      spokenFingerprint: spokenFingerprint,
      spokenText: spokenText
    };
  }

  function portableKeyForIdentity(value) {
    var identity = normalizeIdentity(value);
    if (!identity) return '';
    // Fingerprints are compatibility data, not locator data. A text edit makes
    // a stable segment stale instead of leaving an unreachable old entry.
    return JSON.stringify([identity.adapterId, identity.adapterVersion, identity.scopeId, identity.segmentId]);
  }

  function normalizeSynthesisProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    var out = {};
    ['voice', 'language', 'provider', 'directionFingerprint'].forEach(function (key) {
      if (profile[key] != null && String(profile[key]).trim()) out[key] = String(profile[key]).slice(0, 240);
    });
    var synthesisRate = Number(profile.synthesisRate != null ? profile.synthesisRate : profile.speed);
    if (isFinite(synthesisRate) && synthesisRate > 0 && synthesisRate <= 4) out.synthesisRate = synthesisRate;
    var voiceResolverVersion = Number(profile.voiceResolverVersion);
    if (isFinite(voiceResolverVersion) && voiceResolverVersion > 0) out.voiceResolverVersion = voiceResolverVersion;
    return Object.keys(out).length ? out : null;
  }

  function metadataToProfile(metadata) { return normalizeSynthesisProfile(metadata); }

  function profileToMetadata(profile, createdAt) {
    var out = {};
    var normalized = normalizeSynthesisProfile(profile);
    if (normalized) Object.keys(normalized).forEach(function (key) {
      out[key === 'synthesisRate' ? 'speed' : key] = normalized[key];
    });
    if (createdAt) out.createdAt = createdAt;
    return Object.keys(out).length ? out : null;
  }

  function isHuman(entry) {
    return !!entry && String(entry.source || 'ai').indexOf('human') === 0;
  }

  function profilesCompatible(entry, requested) {
    if (!entry) return false;
    if (isHuman(entry)) return true;
    var stored = entry.synthesisProfile || metadataToProfile(entry.metadata);
    var wanted = normalizeSynthesisProfile(requested) || {};
    // V2 remains the default for legacy callers; version-aware callers may
    // explicitly request a newer resolver contract.
    var requestedResolverVersion = wanted.voiceResolverVersion == null
      ? 2 : Number(wanted.voiceResolverVersion);
    if (!stored || Number(stored.voiceResolverVersion) !== requestedResolverVersion) return false;
    if (wanted.voice && (!stored.voice || String(stored.voice).toLowerCase() !== String(wanted.voice).toLowerCase())) return false;
    if (wanted.synthesisRate != null && stored.synthesisRate != null &&
        Math.abs(Number(stored.synthesisRate) - Number(wanted.synthesisRate)) > 0.001) return false;
    if (wanted.language && stored.language &&
        String(stored.language).toLowerCase() !== String(wanted.language).toLowerCase()) return false;
    if (wanted.directionFingerprint &&
        (!stored.directionFingerprint || String(stored.directionFingerprint) !== String(wanted.directionFingerprint))) return false;
    return true;
  }

  function identitiesCompatible(stored, requested) {
    var a = normalizeIdentity(stored);
    var b = normalizeIdentity(requested);
    return !!(a && b && portableKeyForIdentity(a) === portableKeyForIdentity(b) &&
      String(a.spokenFingerprint) === String(b.spokenFingerprint) &&
      keyFor(a.spokenText) === keyFor(b.spokenText));
  }

  // A per-resource store with V4 identity and V1-V3 legacy lanes. Legacy-only
  // callers retain their exact V3 wire format; identity lookups lazily promote
  // compatible exact sentence matches.
  function createStore() {
    var identities = new Map();
    var legacy = new Map();
    var lastPutError = null;
    var _revoke = function (entry) {
      if (entry && entry.url) { try { URL.revokeObjectURL(entry.url); } catch (_) {} }
    };
    var _estimateBytes = function () {
      var n = 0;
      identities.forEach(function (entry) { n += base64ByteLength(entry.b64); });
      legacy.forEach(function (entry) { n += base64ByteLength(entry.b64); });
      return n;
    };

    var _identityEntriesForText = function (text) {
      var wanted = keyFor(text);
      var matches = [];
      identities.forEach(function (entry) {
        if (keyFor(entry.identity && entry.identity.spokenText) === wanted) matches.push(entry);
      });
      matches.sort(function (a, b) {
        var aKey = portableKeyForIdentity(a.identity);
        var bKey = portableKeyForIdentity(b.identity);
        return aKey < bKey ? -1 : (aKey > bKey ? 1 : 0);
      });
      return matches;
    };

    // Legacy string reads remain available during a partial service rollout.
    // Human audio wins; otherwise use the first deterministic compatible V4
    // entry. Removal deliberately uses the stricter unique-only helper below.
    var _preferredIdentityEntryForText = function (text, requestedProfile, requireCompatible) {
      var matches = _identityEntriesForText(text);
      if (requireCompatible) matches = matches.filter(function (entry) {
        return profilesCompatible(entry, requestedProfile);
      });
      if (!matches.length) return null;
      for (var i = 0; i < matches.length; i++) if (isHuman(matches[i])) return matches[i];
      return matches[0];
    };

    var _uniqueIdentityEntryForText = function (text) {
      var matches = _identityEntriesForText(text);
      return matches.length === 1 ? matches[0] : null;
    };
    var _entryFor = function (target) {
      var identity = normalizeIdentity(target);
      if (identity) return identities.get(portableKeyForIdentity(identity)) ||
        legacy.get(keyFor(identity.spokenText)) || null;
      if (isIdentityTarget(target)) return null;
      return legacy.get(keyFor(target)) || _preferredIdentityEntryForText(target, null, false);
    };

    var _promoteLegacy = function (identity, entry) {
      // Human legacy audio is a read-only dual-read hit. Never duplicate it
      // merely because inspect()/summary asked about a stable identity.
      if (!entry || isHuman(entry)) return entry || null;
      var identityKey = portableKeyForIdentity(identity);
      var legacyKey = keyFor(identity.spokenText);
      legacy.delete(legacyKey);
      entry.identity = Object.assign({}, identity);
      entry.synthesisProfile = entry.synthesisProfile || metadataToProfile(entry.metadata);
      identities.set(identityKey, entry);
      return entry;
    };

    var _inspect = function (target, requestedProfile, promote) {
      var identity = normalizeIdentity(target);
      if (identity) {
        var direct = identities.get(portableKeyForIdentity(identity));
        if (direct) {
          var ready = identitiesCompatible(direct.identity, identity) &&
            profilesCompatible(direct, requestedProfile);
          return {
            status: ready ? 'ready' : 'stale',
            url: ready ? direct.url : null,
            source: direct.source || 'ai',
            identity: Object.assign({}, direct.identity),
            synthesisProfile: direct.synthesisProfile ? Object.assign({}, direct.synthesisProfile) : null,
            legacy: false
          };
        }
        var legacyEntry = legacy.get(keyFor(identity.spokenText));
        if (!legacyEntry) return {
          status: 'missing', url: null, source: null, identity: Object.assign({}, identity),
          synthesisProfile: null, legacy: false
        };
        if (!profilesCompatible(legacyEntry, requestedProfile)) return {
          status: 'stale', url: null, source: legacyEntry.source || 'ai',
          identity: Object.assign({}, identity),
          synthesisProfile: metadataToProfile(legacyEntry.metadata), legacy: true
        };
        var shouldPromote = promote && !isHuman(legacyEntry);
        var resolved = shouldPromote ? _promoteLegacy(identity, legacyEntry) : legacyEntry;
        if (!resolved) return {
          status: 'missing', url: null, source: null, identity: Object.assign({}, identity),
          synthesisProfile: null, legacy: true
        };
        return {
          status: 'ready',
          url: resolved.url,
          source: resolved.source || 'ai',
          identity: Object.assign({}, identity),
          synthesisProfile: resolved.synthesisProfile
            ? Object.assign({}, resolved.synthesisProfile)
            : metadataToProfile(resolved.metadata),
          legacy: !shouldPromote
        };
      }

      if (isIdentityTarget(target)) return {
        status: 'missing', url: null, source: null, identity: null,
        synthesisProfile: null, legacy: false
      };
      var entry = legacy.get(keyFor(target));
      if (!entry) {
        var identityMatches = _identityEntriesForText(target);
        if (identityMatches.length) {
          entry = _preferredIdentityEntryForText(target, requestedProfile, true) ||
            _preferredIdentityEntryForText(target, requestedProfile, false);
        }
      }
      if (!entry) return {
        status: 'missing', url: null, source: null, identity: null,
        synthesisProfile: null, legacy: true
      };
      var compatible = profilesCompatible(entry, requestedProfile);
      return {
        status: compatible ? 'ready' : 'stale',
        url: compatible ? entry.url : null,
        source: entry.source || 'ai',
        identity: entry.identity ? Object.assign({}, entry.identity) : null,
        synthesisProfile: entry.synthesisProfile
          ? Object.assign({}, entry.synthesisProfile)
          : metadataToProfile(entry.metadata),
        legacy: !entry.identity
      };
    };

    var _serializeLegacy = function () {
      var sentences = {};
      var mimes = {};
      var sources = {};
      var metadata = {};
      legacy.forEach(function (entry, key) {
        sentences[key] = entry.b64;
        mimes[key] = entry.mime || 'audio/mpeg';
        sources[key] = entry.source || 'ai';
        if (entry.metadata) metadata[key] = Object.assign({}, entry.metadata);
      });
      return {
        format: 'per-entry', version: 3, sentences: sentences, mimes: mimes,
        sources: sources, metadata: metadata
      };
    };

    var _hydrateLimits = function (options) {
      return {
        maxBytes: Math.max(1024, Number(options && options.maxBytes) || DEFAULT_MAX_BYTES),
        maxClipBytes: Math.max(1024, Number(options && options.maxClipBytes) || DEFAULT_MAX_CLIP_BYTES)
      };
    };

    var _fitsHydrateBudget = function (clean, existing, limits) {
      var clipBytes = base64ByteLength(clean);
      if (clipBytes > limits.maxClipBytes) return false;
      var existingBytes = existing ? base64ByteLength(existing.b64) : 0;
      return _estimateBytes() - existingBytes + clipBytes <= limits.maxBytes;
    };

    var _hydrateLegacy = function (obj, limits) {
      if (!obj || !obj.sentences || typeof obj.sentences !== 'object') return 0;
      var n = 0;
      var mimes = (obj.mimes && typeof obj.mimes === 'object') ? obj.mimes : {};
      var sources = (obj.sources && typeof obj.sources === 'object') ? obj.sources : {};
      var metadata = (obj.metadata && typeof obj.metadata === 'object') ? obj.metadata : {};
      var fallbackMime = obj.format === 'wav' ? 'audio/wav' : 'audio/mpeg';
      var keys = Object.keys(obj.sentences).sort();
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        try {
          var normalizedKey = keyFor(key);
          if (!normalizedKey) continue;
          var existing = legacy.get(normalizedKey);
          var incomingSource = sources[key] || 'ai';
          if (existing && isHuman(existing) &&
              String(incomingSource).indexOf('human') !== 0) continue;
          var clean = cleanBase64(obj.sentences[key]);
          if (!clean || !_fitsHydrateBudget(clean, existing, limits)) continue;
          var mime = mimes[key] || fallbackMime;
          // Limits are checked before decoding or creating a Blob URL.
          var url = b64ToUrl(clean, mime);
          if (!url) continue;
          _revoke(existing);
          legacy.set(normalizedKey, {
            b64: clean,
            mime: mime,
            url: url,
            source: incomingSource,
            metadata: normalizeMetadata(metadata[key]),
            synthesisProfile: metadataToProfile(metadata[key])
          });
          n++;
        } catch (_) {}
      }
      return n;
    };
    return {
      // Raw getters remain for legacy UI/diagnostics. Playback should prefer
      // getCompatible(), which applies voice/profile compatibility.
      get: function (target) {
        var entry = _entryFor(target);
        return entry ? entry.url : null;
      },
      has: function (target) { return !!_entryFor(target); },

      // Existing positional signature is preserved. For an identity target,
      // argument five is serialized as the separate synthesisProfile.
      put: function (target, b64, mime, source, metadata, options) {
        var identity = normalizeIdentity(target);
        var key = identity ? portableKeyForIdentity(identity) :
          (isIdentityTarget(target) ? '' : keyFor(target));
        if (!key) {
          lastPutError = {
            code: 'invalid-identity', clipBytes: 0, currentBytes: _estimateBytes(),
            maxBytes: DEFAULT_MAX_BYTES, maxClipBytes: DEFAULT_MAX_CLIP_BYTES
          };
          return null;
        }
        var clean = cleanBase64(b64);
        var clipBytes = base64ByteLength(clean);
        var lane = identity ? identities : legacy;
        var previous = lane.get(key);
        var previousBytes = previous ? base64ByteLength(previous.b64) : 0;
        var legacyReplacement = identity ? legacy.get(keyFor(identity.spokenText)) : null;
        var incomingSource = source || 'ai';
        var incomingIsHuman = String(incomingSource).indexOf('human') === 0;
        var allowReplaceHuman = !!(options && options.allowReplaceHuman === true);
        var reclaimLegacyBytes = legacyReplacement &&
          (!isHuman(legacyReplacement) || allowReplaceHuman)
          ? base64ByteLength(legacyReplacement.b64) : 0;
        var maxBytes = Math.max(1024, Number(options && options.maxBytes) || DEFAULT_MAX_BYTES);
        var maxClipBytes = Math.max(1024, Number(options && options.maxClipBytes) || DEFAULT_MAX_CLIP_BYTES);
        var currentBytes = _estimateBytes();
        if (!incomingIsHuman && !allowReplaceHuman &&
            (isHuman(previous) || isHuman(legacyReplacement))) {
          lastPutError = {
            code: 'human-recording-protected', clipBytes: clipBytes, currentBytes: currentBytes,
            maxBytes: maxBytes, maxClipBytes: maxClipBytes
          };
          return null;
        }
        if (clipBytes > maxClipBytes) {
          lastPutError = {
            code: 'clip-too-large', clipBytes: clipBytes, currentBytes: currentBytes,
            maxBytes: maxBytes, maxClipBytes: maxClipBytes
          };
          return null;
        }
        if (currentBytes - previousBytes - reclaimLegacyBytes + clipBytes > maxBytes) {
          lastPutError = {
            code: 'resource-limit', clipBytes: clipBytes, currentBytes: currentBytes,
            maxBytes: maxBytes, maxClipBytes: maxClipBytes
          };
          return null;
        }
        var url = null;
        try { url = b64ToUrl(clean, mime); } catch (_) {}
        if (!url) {
          lastPutError = {
            code: 'invalid-audio', clipBytes: clipBytes, currentBytes: currentBytes,
            maxBytes: maxBytes, maxClipBytes: maxClipBytes
          };
          return null;
        }
        _revoke(previous);
        var normalizedMetadata = normalizeMetadata(metadata);
        var entry = {
          b64: clean,
          mime: mime || 'audio/mpeg',
          url: url,
          source: incomingSource,
          metadata: normalizedMetadata,
          synthesisProfile: identity
            ? normalizeSynthesisProfile(metadata)
            : metadataToProfile(normalizedMetadata)
        };
        if (identity) {
          entry.identity = Object.assign({}, identity);
          entry.createdAt = (normalizedMetadata && normalizedMetadata.createdAt) || new Date().toISOString();
        }
        lane.set(key, entry);
        if (identity && legacyReplacement && (!isHuman(legacyReplacement) || allowReplaceHuman)) {
          _revoke(legacyReplacement);
          legacy.delete(keyFor(identity.spokenText));
        }
        lastPutError = null;
        return url;
      },

      sourceOf: function (target) {
        var entry = _entryFor(target);
        return entry ? (entry.source || 'ai') : null;
      },
      metadataOf: function (target) {
        var entry = _entryFor(target);
        if (!entry) return null;
        return entry.metadata
          ? Object.assign({}, entry.metadata)
          : profileToMetadata(entry.synthesisProfile, entry.createdAt);
      },
      synthesisProfileOf: function (target) {
        var entry = _entryFor(target);
        return entry && entry.synthesisProfile
          ? Object.assign({}, entry.synthesisProfile)
          : null;
      },

      // Returns a structured status so counters can distinguish stale audio
      // from truly missing audio. A ready legacy identity match is promoted.
      inspect: function (target, synthesisProfile) {
        return _inspect(target, synthesisProfile, true);
      },
      getCompatible: function (target, synthesisProfile) {
        var result = _inspect(target, synthesisProfile, true);
        return result.status === 'ready' ? result.url : null;
      },

      lastPutError: function () {
        return lastPutError ? Object.assign({}, lastPutError) : null;
      },
      limits: function () {
        return { maxBytes: DEFAULT_MAX_BYTES, maxClipBytes: DEFAULT_MAX_CLIP_BYTES };
      },
      remove: function (target) {
        var identity = normalizeIdentity(target);
        if (!identity && isIdentityTarget(target)) return;
        if (identity) {
          var identityKey = portableKeyForIdentity(identity);
          _revoke(identities.get(identityKey));
          identities.delete(identityKey);
          return;
        }
        var legacyKey = keyFor(target);
        _revoke(legacy.get(legacyKey));
        legacy.delete(legacyKey);
        // Preserve legacy Edit Audio removal during a partial service rollout:
        // a string can remove one unambiguous V4 spelling, never guess among
        // repeated-text identities.
        var uniqueIdentityEntry = _uniqueIdentityEntryForText(target);
        if (uniqueIdentityEntry) {
          var uniqueIdentityKey = portableKeyForIdentity(uniqueIdentityEntry.identity);
          _revoke(uniqueIdentityEntry);
          identities.delete(uniqueIdentityKey);
        }
      },
      size: function () { return identities.size + legacy.size; },
      clear: function () {
        identities.forEach(_revoke);
        legacy.forEach(_revoke);
        identities.clear();
        legacy.clear();
      },

      // With no profile this preserves V3's raw-presence behavior. Supplying a
      // profile makes stale audio part of the missing/preparation list.
      missing: function (targets, synthesisProfile) {
        var checkCompatibility = arguments.length > 1;
        return (Array.isArray(targets) ? targets : []).filter(function (target) {
          return checkCompatibility
            ? _inspect(target, synthesisProfile, true).status !== 'ready'
            : !_entryFor(target);
        });
      },

      // Legacy-only stores remain byte-for-byte shape-compatible with V3.
      // Once identities exist, V4 owns the portable entries and retains only
      // unmatched legacy data (plus human legacy takes, which are never
      // automatically discarded).
      serialize: function () {
        if (!identities.size) return _serializeLegacy();
        var entries = {};
        identities.forEach(function (entry, key) {
          entries[key] = {
            identity: Object.assign({}, entry.identity),
            audio: entry.b64,
            mime: entry.mime || 'audio/mpeg',
            source: entry.source || 'ai',
            synthesisProfile: entry.synthesisProfile
              ? Object.assign({}, entry.synthesisProfile)
              : null,
            createdAt: entry.createdAt ||
              (entry.metadata && entry.metadata.createdAt) ||
              new Date().toISOString()
          };
        });
        return {
          format: 'per-entry',
          version: 4,
          entries: entries,
          legacy: _serializeLegacy()
        };
      },

      // V1-V3 hydrate into the legacy lane. V4 hydrates both lanes and accepts
      // transitional entries arrays or top-level V3 mirrors.
      hydrate: function (obj, options) {
        if (!obj || typeof obj !== 'object') return 0;
        var limits = _hydrateLimits(options);
        if (Number(obj.version) !== 4) return _hydrateLegacy(obj, limits);
        var n = 0;
        var entries = obj.entries && typeof obj.entries === 'object' ? obj.entries : {};
        var list = Array.isArray(entries)
          ? entries.slice()
          : Object.keys(entries).sort().map(function (key) { return entries[key]; });
        for (var i = 0; i < list.length; i++) {
          var raw = list[i];
          if (!raw || typeof raw !== 'object') continue;
          try {
            var identity = normalizeIdentity(raw.identity);
            var identityKey = portableKeyForIdentity(identity);
            if (!identity || !identityKey) continue;
            var existing = identities.get(identityKey);
            var incomingSource = raw.source || 'ai';
            if (existing && isHuman(existing) &&
                String(incomingSource).indexOf('human') !== 0) continue;
            var clean = cleanBase64(raw.audio != null ? raw.audio : raw.b64);
            if (!clean || !_fitsHydrateBudget(clean, existing, limits)) continue;
            var mime = raw.mime || 'audio/mpeg';
            // Limits and provenance protection are checked before Blob creation.
            var url = b64ToUrl(clean, mime);
            if (!url) continue;
            _revoke(existing);
            var profile = normalizeSynthesisProfile(raw.synthesisProfile || raw.metadata);
            var createdAt = raw.createdAt ? String(raw.createdAt).slice(0, 160) : null;
            identities.set(identityKey, {
              identity: identity,
              b64: clean,
              mime: mime,
              url: url,
              source: incomingSource,
              synthesisProfile: profile,
              metadata: profileToMetadata(profile, createdAt),
              createdAt: createdAt
            });
            n++;
          } catch (_) {}
        }
        n += _hydrateLegacy(obj.legacy, limits);
        if (obj.sentences) n += _hydrateLegacy(obj, limits);
        return n;
      },
      estimateBytes: function () { return _estimateBytes(); }
    };
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.KaraokeAudioStore = {
    keyFor: keyFor,
    splitSentences: splitSentences,
    b64ToUrl: b64ToUrl,
    normalizeIdentity: normalizeIdentity,
    portableKeyForIdentity: portableKeyForIdentity,
    normalizeSynthesisProfile: normalizeSynthesisProfile,
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
