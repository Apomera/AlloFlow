/**
 * AlloFlow — Audio Banks Module
 *
 * Four lazy Proxy-backed audio lookup tables consumed by the Word Sounds /
 * phonics / glossary flows:
 *   LETTER_NAME_AUDIO    — a-z letter names ("eh, B!", "C, D...")
 *   INSTRUCTION_AUDIO    — instruction prompts ("count the letters", "blend the sounds")
 *   ISOLATION_AUDIO      — ordinal phoneme isolation ("1st sound", "2nd sound")
 *   PHONEME_AUDIO_BANK   — full phoneme catalog incl. fallback chains (ch→sh, or→orr, etc.)
 *
 * Each Proxy lazily calls a static loader function (returning a map of
 * getAudio('category', 'key') refs) on first access, with cache invalidation
 * driven by the 'audio_bank_loaded' window event the host fires once
 * audio_bank.json finishes loading.
 *
 * External consumer in host: AlloFlowANTI.txt:9340 (glossary warm-up
 * useEffect, null-guarded). All other consumers are CDN modules
 * (word_sounds_module.js, etc.) loaded via the same loadModule batch.
 *
 * Extracted from AlloFlowANTI.txt lines 839-1136 (May 2026, Round 3 Tier B).
 *
 * Fixed during extraction: the original block at lines 907-969 placed 63
 * `_LOAD_INSTRUCTION_AUDIO_RAW('key', getAudio(...))` calls *inside*
 * INSTRUCTION_AUDIO's getOwnPropertyDescriptor handler. Since the loader
 * function signature is zero-arg, the (key, value) pairs were silently
 * ignored, and the handler is rarely invoked anyway. Net: 60+ feedback
 * prompts (fb_amazing, fb_excellent, fb_great_job, letter_a–z,
 * inst_orthography, etc.) have been silently unavailable in production.
 * This module folds those keys into _LOAD_INSTRUCTION_AUDIO_RAW's return
 * object so they actually populate the lazy cache on first access.
 *
 * Depends on: window.getAudio (host mirrors it right after the function
 * definition at AlloFlowANTI.txt:415).
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.AudioBanks) {
    console.log('[CDN] AudioBanksModule already loaded, skipping');
    return;
  }

  // Host mirrors `getAudio` to window before this module loads. We read it
  // lazily so a missing mirror at IIFE-eval time doesn't crash the module.
  function getAudio(category, key) {
    var ga = window.getAudio;
    return (typeof ga === 'function') ? ga(category, key) : null;
  }

  function _LOAD_LETTER_NAME_AUDIO_RAW() { return {
    "a": getAudio('letters', 'a'),
    "b": getAudio('letters', 'b'),
    "c": getAudio('letters', 'c'),
    "d": getAudio('letters', 'd'),
    "e": getAudio('letters', 'e'),
    "f": getAudio('letters', 'f'),
    "g": getAudio('letters', 'g'),
    "h": getAudio('letters', 'h'),
    "i": getAudio('letters', 'i'),
    "j": getAudio('letters', 'j'),
    "k": getAudio('letters', 'k'),
    "l": getAudio('letters', 'l'),
    "m": getAudio('letters', 'm'),
    "n": getAudio('letters', 'n'),
    "o": getAudio('letters', 'o'),
    "p": getAudio('letters', 'p'),
    "q": getAudio('letters', 'q'),
    "r": getAudio('letters', 'r'),
    "s": getAudio('letters', 's'),
    "t": getAudio('letters', 't'),
    "u": getAudio('letters', 'u'),
    "v": getAudio('letters', 'v'),
    "w": getAudio('letters', 'w'),
    "x": getAudio('letters', 'x'),
    "y": getAudio('letters', 'y'),
    "z": getAudio('letters', 'z'),
  }; }
  var _CACHE_LETTER_NAME_AUDIO = null;
  var LETTER_NAME_AUDIO = new Proxy({}, { get: function(target, prop) { if (!_CACHE_LETTER_NAME_AUDIO) _CACHE_LETTER_NAME_AUDIO = _LOAD_LETTER_NAME_AUDIO_RAW(); return _CACHE_LETTER_NAME_AUDIO[prop]; } });

  var _CACHE_INSTRUCTION_AUDIO = null;
  function _LOAD_INSTRUCTION_AUDIO_RAW() {
    return {
      // ── Original keys (AlloFlowANTI.txt:872-886) ──
      counting: getAudio('instructions', 'counting'),
      blending: getAudio('instructions', 'blending'),
      which_word_did_you_hear: getAudio('instructions', 'inst_which_word_did_you_hear'),
      segmentation: getAudio('instructions', 'segmentation'),
      mapping: getAudio('instructions', 'mapping'),
      sound_sort: getAudio('instructions', 'word_families'),
      unscramble: getAudio('instructions', 'unscramble'),
      inst_rhyming: getAudio('instructions', 'inst_rhyming'),
      trace_letter: getAudio('instructions', 'trace_letter'),
      "for": getAudio('instructions', 'for'),
      sound_match_end: getAudio('instructions', 'sound_match_end'),
      sound_sort_house: getAudio('instructions', 'word_families'),
      tap_letters: getAudio('instructions', 'mapping'),
      now_try_lowercase: getAudio('instructions', 'now_try_lowercase'),
      sound_match_start: getAudio('instructions', 'sound_match_start'),
      // ── Recovered from buried dead-code block (was AlloFlowANTI.txt:907-969,
      //    inside getOwnPropertyDescriptor with arg-ignored signature). These
      //    are feedback prompts + per-letter narrations that were silently
      //    unavailable in production until this extraction. ──
      fb_amazing: getAudio('instructions', 'fb_amazing'),
      fb_excellent: getAudio('instructions', 'fb_excellent'),
      fb_great_job: getAudio('instructions', 'fb_great_job'),
      fb_nice: getAudio('instructions', 'fb_nice'),
      fb_way_to_go: getAudio('instructions', 'fb_way_to_go'),
      fb_you_got_it: getAudio('instructions', 'fb_you_got_it'),
      fb_perfect: getAudio('instructions', 'fb_perfect'),
      fb_correct: getAudio('instructions', 'fb_correct'),
      fb_on_fire: getAudio('instructions', 'fb_on_fire'),
      fb_keep_going: getAudio('instructions', 'fb_keep_going'),
      fb_try_again: getAudio('instructions', 'fb_try_again'),
      fb_listen_again: getAudio('instructions', 'fb_listen_again'),
      fb_super: getAudio('instructions', 'fb_super'),
      fb_terrific: getAudio('instructions', 'fb_terrific'),
      fb_wow: getAudio('instructions', 'fb_wow'),
      fb_almost: getAudio('instructions', 'fb_almost'),
      fb_try_again_listen: getAudio('instructions', 'fb_try_again_listen'),
      inst_orthography: getAudio('instructions', 'inst_orthography'),
      inst_spelling_bee: getAudio('instructions', 'inst_spelling_bee'),
      inst_word_scramble: getAudio('instructions', 'inst_word_scramble'),
      inst_missing_letter: getAudio('instructions', 'inst_missing_letter'),
      inst_counting: getAudio('instructions', 'inst_counting'),
      inst_blending: getAudio('instructions', 'inst_blending'),
      inst_which_word_did_you_hear: getAudio('instructions', 'inst_which_word_did_you_hear'),
      inst_segmentation: getAudio('instructions', 'inst_segmentation'),
      inst_letter_tracing: getAudio('instructions', 'inst_letter_tracing'),
      inst_for: getAudio('instructions', 'inst_for'),
      inst_which_word: getAudio('instructions', 'inst_which_word'),
      inst_find_start_sound: getAudio('instructions', 'inst_find_start_sound'),
      inst_find_end_sound: getAudio('instructions', 'inst_find_end_sound'),
      inst_tap_letters: getAudio('instructions', 'inst_tap_letters'),
      inst_sound_sort: getAudio('instructions', 'inst_word_families'),
      inst_sound_scramble: getAudio('instructions', 'inst_sound_scramble'),
      letter_a: getAudio('instructions', 'letter_a'),
      letter_b: getAudio('instructions', 'letter_b'),
      letter_c: getAudio('instructions', 'letter_c'),
      letter_d: getAudio('instructions', 'letter_d'),
      letter_e: getAudio('instructions', 'letter_e'),
      letter_f: getAudio('instructions', 'letter_f'),
      letter_g: getAudio('instructions', 'letter_g'),
      letter_h: getAudio('instructions', 'letter_h'),
      letter_i: getAudio('instructions', 'letter_i'),
      letter_j: getAudio('instructions', 'letter_j'),
      letter_k: getAudio('instructions', 'letter_k'),
      letter_l: getAudio('instructions', 'letter_l'),
      letter_m: getAudio('instructions', 'letter_m'),
      letter_n: getAudio('instructions', 'letter_n'),
      letter_o: getAudio('instructions', 'letter_o'),
      letter_p: getAudio('instructions', 'letter_p'),
      letter_q: getAudio('instructions', 'letter_q'),
      letter_r: getAudio('instructions', 'letter_r'),
      letter_s: getAudio('instructions', 'letter_s'),
      letter_t: getAudio('instructions', 'letter_t'),
      letter_u: getAudio('instructions', 'letter_u'),
      letter_v: getAudio('instructions', 'letter_v'),
      letter_w: getAudio('instructions', 'letter_w'),
      letter_x: getAudio('instructions', 'letter_x'),
      letter_y: getAudio('instructions', 'letter_y'),
      letter_z: getAudio('instructions', 'letter_z'),
    };
  }
  var INSTRUCTION_AUDIO = new Proxy({}, {
    get: function(target, prop) {
      if (prop === 'raw_ref') return null;
      if (!_CACHE_INSTRUCTION_AUDIO) {
        _CACHE_INSTRUCTION_AUDIO = _LOAD_INSTRUCTION_AUDIO_RAW();
      }
      return _CACHE_INSTRUCTION_AUDIO[prop];
    },
    has: function(target, prop) {
      if (!_CACHE_INSTRUCTION_AUDIO) _CACHE_INSTRUCTION_AUDIO = _LOAD_INSTRUCTION_AUDIO_RAW();
      return prop in _CACHE_INSTRUCTION_AUDIO;
    },
    ownKeys: function(target) {
      if (!_CACHE_INSTRUCTION_AUDIO) _CACHE_INSTRUCTION_AUDIO = _LOAD_INSTRUCTION_AUDIO_RAW();
      return Reflect.ownKeys(_CACHE_INSTRUCTION_AUDIO);
    },
    getOwnPropertyDescriptor: function(target, prop) {
      if (!_CACHE_INSTRUCTION_AUDIO) _CACHE_INSTRUCTION_AUDIO = _LOAD_INSTRUCTION_AUDIO_RAW();
      var desc = Reflect.getOwnPropertyDescriptor(_CACHE_INSTRUCTION_AUDIO, prop); if (desc) { desc.configurable = true; desc.writable = true; } return desc;
    },
    set: function(target, prop, value) {
      if (!_CACHE_INSTRUCTION_AUDIO) _CACHE_INSTRUCTION_AUDIO = _LOAD_INSTRUCTION_AUDIO_RAW();
      _CACHE_INSTRUCTION_AUDIO[prop] = value;
      return true;
    },
    defineProperty: function(target, prop, descriptor) {
      if (!_CACHE_INSTRUCTION_AUDIO) _CACHE_INSTRUCTION_AUDIO = _LOAD_INSTRUCTION_AUDIO_RAW();
      Object.defineProperty(_CACHE_INSTRUCTION_AUDIO, prop, descriptor);
      return true;
    }
  });

  var _CACHE_ISOLATION_AUDIO = null;
  function _LOAD_ISOLATION_AUDIO_RAW() {
    return {
      '1st': getAudio('isolation', '1st'),
      '2nd': getAudio('isolation', '2nd'),
      '3rd': getAudio('isolation', '3rd'),
      '4th': getAudio('isolation', '4th'),
      '5th': getAudio('isolation', '5th'),
      '6th': getAudio('isolation', '6th'),
      '7th': getAudio('isolation', '7th'),
      '8th': getAudio('isolation', '8th'),
      '9th': getAudio('isolation', '9th'),
      '10th': getAudio('isolation', '10th'),
      'fallback': null
    };
  }
  var ISOLATION_AUDIO = new Proxy({}, {
    get: function(target, prop) {
      if (prop === 'raw_ref') return null;
      if (!_CACHE_ISOLATION_AUDIO) {
        _CACHE_ISOLATION_AUDIO = _LOAD_ISOLATION_AUDIO_RAW();
      }
      return _CACHE_ISOLATION_AUDIO[prop];
    },
    has: function(target, prop) {
      if (!_CACHE_ISOLATION_AUDIO) _CACHE_ISOLATION_AUDIO = _LOAD_ISOLATION_AUDIO_RAW();
      return prop in _CACHE_ISOLATION_AUDIO;
    },
    ownKeys: function(target) {
      if (!_CACHE_ISOLATION_AUDIO) _CACHE_ISOLATION_AUDIO = _LOAD_ISOLATION_AUDIO_RAW();
      return Reflect.ownKeys(_CACHE_ISOLATION_AUDIO);
    },
    getOwnPropertyDescriptor: function(target, prop) {
      if (!_CACHE_ISOLATION_AUDIO) _CACHE_ISOLATION_AUDIO = _LOAD_ISOLATION_AUDIO_RAW();
      var desc = Reflect.getOwnPropertyDescriptor(_CACHE_ISOLATION_AUDIO, prop); if (desc) { desc.configurable = true; desc.writable = true; } return desc;
    },
    set: function(target, prop, value) {
      if (!_CACHE_ISOLATION_AUDIO) _CACHE_ISOLATION_AUDIO = _LOAD_ISOLATION_AUDIO_RAW();
      _CACHE_ISOLATION_AUDIO[prop] = value;
      return true;
    },
    defineProperty: function(target, prop, descriptor) {
      if (!_CACHE_ISOLATION_AUDIO) _CACHE_ISOLATION_AUDIO = _LOAD_ISOLATION_AUDIO_RAW();
      Object.defineProperty(_CACHE_ISOLATION_AUDIO, prop, descriptor);
      return true;
    }
  });

  var _CACHE_PHONEME_AUDIO_BANK = null;
  function _LOAD_PHONEME_AUDIO_BANK_RAW() {
    return {
      'ear': getAudio('phonemes', 'ear'),
      'ow': getAudio('phonemes', 'ow'),
      'th': getAudio('phonemes', 'th'),
      'l': getAudio('phonemes', 'l'),
      'ie': getAudio('phonemes', 'ie'),
      'e': getAudio('phonemes', 'e'),
      'y': getAudio('phonemes', 'y'),
      'wh': getAudio('phonemes', 'wh'),
      'k': getAudio('phonemes', 'k'),
      'u': getAudio('phonemes', 'u'),
      'q': getAudio('phonemes', 'q'),
      'n': getAudio('phonemes', 'n'),
      'h': getAudio('phonemes', 'h'),
      'b': getAudio('phonemes', 'b'),
      'oy': getAudio('phonemes', 'oy'),
      'ph': getAudio('phonemes', 'ph'),
      'd': getAudio('phonemes', 'd'),
      'oo': getAudio('phonemes', 'oo'),
      'z': getAudio('phonemes', 'z'),
      's': getAudio('phonemes', 's'),
      'er': getAudio('phonemes', 'er'),
      'sh': getAudio('phonemes', 'sh'),
      'g': getAudio('phonemes', 'g'),
      'ng': getAudio('phonemes', 'ng'),
      'oa': getAudio('phonemes', 'oa'),
      'a': getAudio('phonemes', 'a'),
      'r': getAudio('phonemes', 'r'),
      'v': getAudio('phonemes', 'v'),
      'ck': getAudio('phonemes', 'ck'),
      'ee': getAudio('phonemes', 'ee'),
      'c': getAudio('phonemes', 'c'),
      't': getAudio('phonemes', 't'),
      'p': getAudio('phonemes', 'p'),
      'm': getAudio('phonemes', 'm'),
      'ch': getAudio('phonemes', 'ch'),
      'w': getAudio('phonemes', 'w'),
      'ar': getAudio('phonemes', 'ar'),
      'o': getAudio('phonemes', 'o'),
      'f': getAudio('phonemes', 'f'),
      'i': getAudio('phonemes', 'i'),
      'ay': getAudio('phonemes', 'ay'),
      'j': getAudio('phonemes', 'j'),
      'ir': getAudio('phonemes', 'ir'),
      'ur': getAudio('phonemes', 'ur'),
      'or': getAudio('phonemes', 'or'),
      'air': getAudio('phonemes', 'air'),
    };
  }
  var PHONEME_AUDIO_BANK = new Proxy({}, {
    get: function(target, prop) {
      if (prop === 'raw_ref') return null;
      if (!_CACHE_PHONEME_AUDIO_BANK) {
        _CACHE_PHONEME_AUDIO_BANK = _LOAD_PHONEME_AUDIO_BANK_RAW();
      }
      return _CACHE_PHONEME_AUDIO_BANK[prop];
    },
    has: function(target, prop) {
      if (!_CACHE_PHONEME_AUDIO_BANK) _CACHE_PHONEME_AUDIO_BANK = _LOAD_PHONEME_AUDIO_BANK_RAW();
      return prop in _CACHE_PHONEME_AUDIO_BANK;
    },
    ownKeys: function(target) {
      if (!_CACHE_PHONEME_AUDIO_BANK) _CACHE_PHONEME_AUDIO_BANK = _LOAD_PHONEME_AUDIO_BANK_RAW();
      return Reflect.ownKeys(_CACHE_PHONEME_AUDIO_BANK);
    },
    getOwnPropertyDescriptor: function(target, prop) {
      if (!_CACHE_PHONEME_AUDIO_BANK) _CACHE_PHONEME_AUDIO_BANK = _LOAD_PHONEME_AUDIO_BANK_RAW();
      var desc = Reflect.getOwnPropertyDescriptor(_CACHE_PHONEME_AUDIO_BANK, prop); if (desc) { desc.configurable = true; desc.writable = true; } return desc;
    },
    set: function(target, prop, value) {
      if (!_CACHE_PHONEME_AUDIO_BANK) _CACHE_PHONEME_AUDIO_BANK = _LOAD_PHONEME_AUDIO_BANK_RAW();
      _CACHE_PHONEME_AUDIO_BANK[prop] = value;
      return true;
    },
    defineProperty: function(target, prop, descriptor) {
      if (!_CACHE_PHONEME_AUDIO_BANK) _CACHE_PHONEME_AUDIO_BANK = _LOAD_PHONEME_AUDIO_BANK_RAW();
      Object.defineProperty(_CACHE_PHONEME_AUDIO_BANK, prop, descriptor);
      return true;
    }
  });

  // ── Eager phoneme augmentation + fallback chains (originally
  //    AlloFlowANTI.txt:1117-1135). Runs once getAudio is wired up; if not
  //    yet wired, defers until 'audio_bank_loaded' fires. ──
  function _finalizePhonemeBank() {
    PHONEME_AUDIO_BANK['aw'] = getAudio('phonemes', 'aw');
    PHONEME_AUDIO_BANK['dh'] = getAudio('phonemes', 'dh');
    PHONEME_AUDIO_BANK['ee'] = getAudio('phonemes', 'ee');
    PHONEME_AUDIO_BANK['g'] = getAudio('phonemes', 'g');
    PHONEME_AUDIO_BANK['k'] = getAudio('phonemes', 'k');
    PHONEME_AUDIO_BANK['oo_short'] = getAudio('phonemes', 'oo_short');
    PHONEME_AUDIO_BANK['or'] = getAudio('phonemes', 'or');
    PHONEME_AUDIO_BANK['p'] = getAudio('phonemes', 'p');
    PHONEME_AUDIO_BANK['th'] = getAudio('phonemes', 'th');
    PHONEME_AUDIO_BANK['ue'] = getAudio('phonemes', 'ue');
    PHONEME_AUDIO_BANK['zh'] = getAudio('phonemes', 'zh');
    PHONEME_AUDIO_BANK['sh'] = getAudio('phonemes', 'sh');
    PHONEME_AUDIO_BANK['ch'] = getAudio('phonemes', 'ch');
    if (!PHONEME_AUDIO_BANK['ch'] && PHONEME_AUDIO_BANK['sh']) PHONEME_AUDIO_BANK['ch'] = PHONEME_AUDIO_BANK['sh'];
    if (PHONEME_AUDIO_BANK['or'] && !PHONEME_AUDIO_BANK['orr']) PHONEME_AUDIO_BANK['orr'] = PHONEME_AUDIO_BANK['or'];
    if (PHONEME_AUDIO_BANK['ar'] && !PHONEME_AUDIO_BANK['ahrr']) PHONEME_AUDIO_BANK['ahrr'] = PHONEME_AUDIO_BANK['ar'];
    if (PHONEME_AUDIO_BANK['er'] && !PHONEME_AUDIO_BANK['err']) PHONEME_AUDIO_BANK['err'] = PHONEME_AUDIO_BANK['er'];
  }
  // Try once immediately; if getAudio not wired yet, the audio_bank_loaded
  // listener below will catch it.
  try { _finalizePhonemeBank(); } catch (e) { console.warn('[AudioBanks] eager finalize deferred:', e && e.message); }

  // Cache invalidation when audio_bank.json finishes loading (originally
  // AlloFlowANTI.txt:434-440 host-scope listener).
  window.addEventListener('audio_bank_loaded', function () {
    _CACHE_PHONEME_AUDIO_BANK = null;
    _CACHE_INSTRUCTION_AUDIO = null;
    _CACHE_LETTER_NAME_AUDIO = null;
    _CACHE_ISOLATION_AUDIO = null;
    try { _finalizePhonemeBank(); } catch (e) { console.warn('[AudioBanks] post-load finalize failed:', e && e.message); }
  });

  // Window mirrors — match host-scope window.* assignments at original
  // AlloFlowANTI.txt:1114-1116 and 1136. Plus the four bare names so any
  // external code reading window.LETTER_NAME_AUDIO etc. still works.
  window.LETTER_NAME_AUDIO = LETTER_NAME_AUDIO;
  window.INSTRUCTION_AUDIO = INSTRUCTION_AUDIO;
  window.ISOLATION_AUDIO = ISOLATION_AUDIO;
  window.PHONEME_AUDIO_BANK = PHONEME_AUDIO_BANK;
  window.__ALLO_INSTRUCTION_AUDIO = INSTRUCTION_AUDIO;
  window.__ALLO_ISOLATION_AUDIO = ISOLATION_AUDIO;
  window.__ALLO_PHONEME_AUDIO_BANK = PHONEME_AUDIO_BANK;

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AudioBanks = {
    LETTER_NAME_AUDIO: LETTER_NAME_AUDIO,
    INSTRUCTION_AUDIO: INSTRUCTION_AUDIO,
    ISOLATION_AUDIO: ISOLATION_AUDIO,
    PHONEME_AUDIO_BANK: PHONEME_AUDIO_BANK
  };

  if (typeof window._upgradeAudioBanks === 'function') {
    try { window._upgradeAudioBanks(); } catch (e) { console.warn('[AudioBanks] upgrade hook failed', e); }
  }

  console.log('[CDN] AudioBanksModule loaded — 4 lazy proxies registered');
})();
