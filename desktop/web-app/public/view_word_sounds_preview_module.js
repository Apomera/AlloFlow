/**
 * AlloFlow View - Word Sounds Preview Card
 *
 * Extracted from AlloFlowANTI.txt activeView==='word-sounds' && !isWordSoundsMode block.
 * Source range: 27 lines body. The simplest renderer in the project — a launcher
 * card with an educator-only review button and a learner launch button.
 * The actual modal lives in word_sounds_module.js (separate CDN module).
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.WordSoundsPreviewView) {
    console.log('[CDN] ViewWordSoundsPreviewModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewWordSoundsPreviewModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var BookOpen = _lazyIcon('BookOpen');
  var Play = _lazyIcon('Play');

  (function (root, factory) {
  if (root && root.window) root = root.window;
  var existing = root && root.AlloModules && root.AlloModules.WordSoundsReadiness;
  var api = existing && existing.VERSION === 3 && typeof existing.portable === 'function' ? existing : factory(root || {});
  if (root) {
    root.AlloModules = root.AlloModules || {};
    root.AlloModules.WordSoundsReadiness = api;
  }
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (host) {
  'use strict';

  var VERSION = 3,
    MAX_TARGETS = 1024,
    MAX_WORDS = 200,
    MAX_CLIP_CHARS = 512 * 1024;
  var INST = {
    decoding: 'decoding',
    orthography: 'inst_orthography',
    spelling_bee: 'inst_spelling_bee',
    word_scramble: 'inst_word_scramble',
    missing_letter: 'inst_missing_letter',
    counting: 'inst_counting',
    blending: 'inst_blending',
    segmentation: 'inst_segmentation',
    mapping: 'mapping',
    syllable_blending: 'inst_syllable_blending',
    syllable_counting: 'inst_syllable_counting'
  };
  var FEEDBACK = ['fb_try_again_listen', 'fb_almost', 'fb_amazing', 'fb_on_fire', 'fb_excellent', 'fb_wow', 'fb_you_got_it', 'fb_great_job', 'fb_nice', 'fb_keep_going', 'fb_way_to_go', 'fb_perfect', 'fb_correct'];
  var BANKS = {
    phoneme: '__ALLO_PHONEME_AUDIO_BANK',
    instruction: '__ALLO_INSTRUCTION_AUDIO',
    feedback: '__ALLO_INSTRUCTION_AUDIO',
    isolation: '__ALLO_ISOLATION_AUDIO',
    'letter-name': '__ALLO_LETTER_NAME_AUDIO_BANK'
  };
  var receipts = new Map(),
    activeRuns = new Map(),
    serial = 0;
  var keyOf = function (value) {
    return typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, ' ') : '';
  };
  var wordOf = function (item) {
    return keyOf(item && (item.targetWord || item.word || item.term || item.singleWord || item.displayWord));
  };
  var safeKey = function (key) {
    return key && key.length <= 240 && !/[\u0000-\u001f\u007f]/.test(key);
  };
  var wordsOf = function (resource) {
    return resource && Array.isArray(resource.wsPreloadedWords) && resource.wsPreloadedWords.length ? resource.wsPreloadedWords : resource && Array.isArray(resource.data) ? resource.data : [];
  };
  function descriptor(asset) {
    var mime, base64;
    if (typeof asset === 'string') {
      var match = asset.match(/^data:(audio\/[a-z0-9.+-]+);base64,([\s\S]+)$/i);
      if (!match) return {
        status: /^https:\/\/[^\s]+$/i.test(asset) ? 'online-fetch' : /^blob:/i.test(asset) ? 'device-only' : 'invalid'
      };
      mime = match[1];
      base64 = match[2];
    } else if (asset && typeof asset === 'object' && !Array.isArray(asset)) {
      mime = asset.mime;
      base64 = asset.base64;
    } else return {
      status: 'missing'
    };
    mime = keyOf(mime);
    base64 = typeof base64 === 'string' ? base64.replace(/\s/g, '') : '';
    if (!/^audio\/(?:mpeg|mp3|wav|x-wav|wave|ogg|webm|mp4|x-m4a|aac|flac)$/.test(mime)) return {
      status: 'unsupported',
      mime: mime
    };
    if (!base64 || base64.length > MAX_CLIP_CHARS || base64.length % 4 !== 0 || !/^(?:[a-z0-9+/]{4})*(?:[a-z0-9+/]{2}==|[a-z0-9+/]{3}=)?$/i.test(base64)) return {
      status: 'invalid',
      mime: mime
    };
    var bytes;
    try {
      if (typeof atob === 'function') {
        bytes = atob(base64);
        if (typeof btoa === 'function' && btoa(bytes) !== base64) return {
          status: 'invalid',
          mime: mime
        };
      } else if (typeof Buffer !== 'undefined') {
        var buffer = Buffer.from(base64, 'base64');
        if (buffer.toString('base64') !== base64) return {
          status: 'invalid',
          mime: mime
        };
        bytes = buffer.toString('binary');
      } else return {
        status: 'unverified',
        mime: mime
      };
    } catch (_) {
      return {
        status: 'invalid',
        mime: mime
      };
    }
    var at = function (i) {
      return bytes.charCodeAt(i);
    };
    var wav = bytes.length > 44 && bytes.slice(0, 4) === 'RIFF' && bytes.slice(8, 12) === 'WAVE';
    var mp3 = bytes.length > 10 && (bytes.slice(0, 3) === 'ID3' && at(3) >= 2 && at(3) <= 4 || at(0) === 255 && (at(1) & 224) === 224 && (at(1) & 6) !== 0);
    var aac = bytes.length > 7 && at(0) === 255 && (at(1) & 246) === 240;
    var ogg = bytes.length > 27 && bytes.slice(0, 4) === 'OggS' && at(4) === 0;
    var webm = bytes.length > 8 && at(0) === 26 && at(1) === 69 && at(2) === 223 && at(3) === 163;
    var mp4 = bytes.length > 12 && bytes.slice(4, 8) === 'ftyp';
    var flac = bytes.length > 8 && bytes.slice(0, 4) === 'fLaC';
    var valid = /wav|wave/.test(mime) ? wav : /mpeg|mp3/.test(mime) ? mp3 : mime === 'audio/aac' ? aac : /ogg/.test(mime) ? ogg : /webm/.test(mime) ? webm : /flac/.test(mime) ? flac : mp4;
    if (!valid) return {
      status: 'invalid',
      mime: mime
    };
    return {
      status: 'embedded-portable',
      mime: mime,
      base64: base64,
      src: 'data:' + mime + ';base64,' + base64
    };
  }
  function portable(resource) {
    if (!resource || resource.type !== 'word-sounds' || !Array.isArray(resource.data) && !Array.isArray(resource.wsPreloadedWords)) return resource;
    var normalized = Object.assign({}, resource);
    ['wsPreloadedWords', 'data'].forEach(function (layout) {
      if (Array.isArray(resource[layout])) normalized[layout] = resource[layout].map(function (word) {
        return word && typeof word === 'object' && !Array.isArray(word) ? Object.assign({}, word) : word;
      });
    });
    {
      let remainingAudioChars = 6 * 1024 * 1024;
      let remainingAudioItems = 512;
      const omittedAudioKeys = new Set();
      const safeTtsKey = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240);
      const recordOmittedTtsKey = (key, omittedKeys) => {
        if (!key || !omittedAudioKeys.has(key) && omittedAudioKeys.size >= 512) return;
        omittedAudioKeys.add(key);
        omittedKeys.add(key);
      };
      const safePortableTtsAssets = (value, omittedKeys) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        const safeAssets = Object.create(null);
        for (const [rawKey, rawAsset] of Object.entries(value)) {
          const key = safeTtsKey(rawKey);
          if (!key) continue;
          const dataAudio = typeof rawAsset === 'string' ? rawAsset.match(/^data:([^;]+);base64,([\s\S]*)$/i) : null;
          const asset = dataAudio ? {
            mime: dataAudio[1],
            base64: dataAudio[2]
          } : rawAsset;
          const mime = asset && typeof asset === 'object' && !Array.isArray(asset) ? String(asset.mime || '').trim().toLowerCase() : '';
          const base64 = asset && typeof asset.base64 === 'string' ? asset.base64.replace(/\s+/g, '') : '';
          if (!/^audio\/[a-z0-9.+-]{1,48}$/i.test(mime) || !base64 || base64.length > 512 * 1024 || base64.length > remainingAudioChars || remainingAudioItems <= 0 || !/^[a-z0-9+/]+={0,2}$/i.test(base64) || base64.length % 4 === 1 || base64.includes('=') && base64.length % 4 !== 0) {
            recordOmittedTtsKey(key, omittedKeys);
            continue;
          }
          if (Object.prototype.hasOwnProperty.call(safeAssets, key)) {
            recordOmittedTtsKey(key, omittedKeys);
            continue;
          }
          safeAssets[key] = {
            mime,
            base64
          };
          remainingAudioChars -= base64.length;
          remainingAudioItems -= 1;
        }
        return Object.keys(safeAssets).length > 0 ? safeAssets : null;
      };
      const safeRequiredTtsKeys = value => {
        if (!Array.isArray(value)) return null;
        const keys = Array.from(new Set(value.map(safeTtsKey).filter(Boolean))).slice(0, 1024);
        return keys.length > 0 ? keys : null;
      };
      ['wsPreloadedWords', 'data'].forEach(layout => {
        if (!Array.isArray(resource[layout]) || !Array.isArray(normalized[layout])) return;
        resource[layout].forEach((sourceWord, wordIndex) => {
          const packedWord = normalized[layout][wordIndex];
          if (!sourceWord || !packedWord || typeof packedWord !== 'object' || Array.isArray(sourceWord) || Array.isArray(packedWord)) return;
          const omittedKeys = new Set();
          const safeAssets = safePortableTtsAssets(sourceWord._ttsAssets, omittedKeys);
          if (safeAssets) packedWord._ttsAssets = safeAssets;else delete packedWord._ttsAssets;
          const targetWord = sourceWord.targetWord || sourceWord.word || sourceWord.term || sourceWord.singleWord || sourceWord.displayWord;
          const requiredKeys = safeRequiredTtsKeys([targetWord, ...(Array.isArray(sourceWord._ttsRequiredKeys) ? sourceWord._ttsRequiredKeys : [])]);
          if (requiredKeys) packedWord._ttsRequiredKeys = requiredKeys;else delete packedWord._ttsRequiredKeys;
          const priorOmittedKeys = safeRequiredTtsKeys(sourceWord._ttsOmittedKeys) || [];
          priorOmittedKeys.forEach(key => recordOmittedTtsKey(key, omittedKeys));
          const unresolvedOmittedKeys = Array.from(omittedKeys).filter(key => !safeAssets || !Object.prototype.hasOwnProperty.call(safeAssets, key));
          if (unresolvedOmittedKeys.length) packedWord._ttsOmittedKeys = unresolvedOmittedKeys;else delete packedWord._ttsOmittedKeys;
        });
      });
    }
    return normalized;
  }
  function requirements(resource) {
    var entries = new Map(),
      overflow = false,
      unknownActivities = [];
    var add = function (label, category) {
      var key = keyOf(label),
        id = category + ':' + key;
      if (!key || entries.has(id)) return;
      if (!safeKey(key) || entries.size >= MAX_TARGETS) {
        overflow = true;
        return;
      }
      entries.set(id, {
        id: id,
        key: key,
        category: category,
        label: key
      });
    };
    var sound = function (value) {
      add(typeof value === 'string' ? value.replace(/^\/+|\/+$/g, '') : '', 'phoneme');
    };
    var words = wordsOf(resource),
      config = resource && resource.sessionConfig || {};
    var sequence = resource && resource.lessonPlanSequence || config.activitySequence;
    var activities = Array.isArray(sequence) && sequence.length ? sequence : config.initialActivity ? [config.initialActivity] : [];
    if (!activities.length) activities = Array.from(new Set(words.flatMap(function (item) {
      return item && Array.isArray(item._preparedActivities) ? item._preparedActivities : [];
    })));
    if (!activities.length) activities = ['counting'];
    activities = Array.from(new Set(activities));
    var known = Object.keys(INST).concat(['isolation', 'rhyming', 'manipulation', 'letter_tracing', 'sound_sort', 'word_families', 'decoding', 'read_sentence', 'read_passage', 'sentence_match']);
    activities.forEach(function (activity) {
      if (known.indexOf(activity) === -1) unknownActivities.push(String(activity));
    });
    words.slice(0, MAX_WORDS).forEach(function (item) {
      if (!item || typeof item !== 'object' || !wordOf(item)) {
        overflow = true;
        return;
      }
      add(wordOf(item), 'speech');
      (Array.isArray(item._ttsRequiredKeys) ? item._ttsRequiredKeys : []).slice(0, MAX_TARGETS + 1).forEach(function (key) {
        add(key, 'speech');
      });
      if (item._ttsRequiredKeys && item._ttsRequiredKeys.length > MAX_TARGETS) overflow = true;
      var boards = item.activityItems || {};
      activities.forEach(function (activity) {
        var board = boards[activity] || {};
        var fieldMap = {
          blending: ['options'],
          rhyming: ['options'],
          manipulation: ['options'],
          syllable_blending: ['syllables', 'options'],
          syllable_counting: ['syllables'],
          orthography: ['options'],
          sound_sort: ['options', 'distractors'],
          word_families: ['options', 'distractors'],
          decoding: ['choices'],
          read_sentence: ['options'],
          read_passage: ['options'],
          sentence_match: ['sequence', 'extras']
        };
        (fieldMap[activity] || []).forEach(function (field) {
          (Array.isArray(board[field]) ? board[field] : []).forEach(function (value) {
            add(value, 'speech');
          });
        });
        if (['blending', 'segmentation', 'isolation', 'counting', 'mapping'].indexOf(activity) !== -1) (Array.isArray(item.phonemes) ? item.phonemes : []).forEach(sound);
        if (activity === 'isolation') {
          (Array.isArray(board.options) ? board.options : []).forEach(sound);
          var ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
          var position = board.position;
          if (typeof position === 'number') add(ordinals[position] || '', 'isolation');else if (position) add({
            first: '1st',
            middle: 'middle',
            last: 'last'
          }[position] || position, 'isolation');else add('unknown-position', 'isolation');
        }
        if (activity === 'segmentation') (Array.isArray(board.chips) ? board.chips : []).forEach(function (chip) {
          sound(chip && chip.phoneme);
        });
        if (activity === 'mapping') (Array.isArray(board.chipOrder) ? board.chipOrder : []).forEach(function (chip) {
          sound(chip && chip.text);
        });
        if (activity === 'missing_letter') (Array.isArray(board.options) ? board.options : []).forEach(sound);
        if (INST[activity]) add(INST[activity], 'instruction');
        if (activity === 'blending') add('which_word_did_you_hear', 'instruction');
        if (activity === 'rhyming') add('inst_rhyming', 'instruction');
        if (activity === 'read_sentence' || activity === 'sentence_match') {
          add(board.sentence, 'speech');
          add(activity === 'read_sentence' ? 'Read the sentence. Which word finishes it?' : 'Read the sentence. Match the pictures to it.', 'speech');
        }
        if (activity === 'read_passage') {
          add(board.story, 'speech');
          String(board.story || '').split(/(?<=[.!?])\s+/).forEach(function (line) {
            add(line, 'speech');
          });
          add('Read the story. Which word finishes it?', 'speech');
        }
        if (activity === 'manipulation') {
          String(board.task && board.task.instruction || item.manipulationTask && item.manipulationTask.instruction || '').split(/(\/[^\s/]{1,4}\/)/g).forEach(function (part) {
            if (/^\/[^/]+\/$/.test(part.trim())) sound(part.trim());else if (/[a-z0-9]/i.test(part)) add(part, 'speech');
          });
        }
        if (activity === 'letter_tracing') {
          ['trace_letter', 'for', 'now_try_lowercase'].forEach(function (key) {
            add(key, 'instruction');
          });
          add(wordOf(item).slice(0, 1), 'letter-name');
        }
        if (activity === 'sound_sort') {
          add(board.mode === 'last' ? 'sound_match_end' : 'sound_match_start', 'instruction');
          add('as_in', 'instruction');
          sound(board.targetChar);
          if (!board.targetChar) overflow = true;
        }
        if (activity === 'word_families') {
          if (board.rime) add('Find all words in the ' + board.rime + ' family', 'speech');else overflow = true;
        }
      });
    });
    if (words.length > MAX_WORDS) overflow = true;
    if (words.length && !(resource && resource.isProbeMode)) FEEDBACK.forEach(function (key) {
      add(key, 'feedback');
    });
    return {
      entries: Array.from(entries.values()),
      activities: activities,
      overflow: overflow,
      unknownActivities: unknownActivities,
      wordCount: words.length
    };
  }
  function build(resource, options) {
    var route = options.route || 'student-pack',
      bounded = route === 'student-pack' || route === 'mailbox';
    var deliveredResource = bounded ? portable(resource) : resource;
    var needed = requirements(deliveredResource),
      assets = Object.create(null),
      totalChars = 0,
      itemCount = 0;
    var selectedWords = wordsOf(deliveredResource).slice(0, MAX_WORDS);
    var deliveredWords = selectedWords;
    var omittedLabels = Array.from(new Set(deliveredWords.flatMap(function (word) {
      return word && Array.isArray(word._ttsOmittedKeys) ? word._ttsOmittedKeys : [];
    }).map(keyOf).filter(safeKey))).slice(0, 512);
    deliveredWords.forEach(function (word) {
      var map = word && word._ttsAssets;
      if (!map || typeof map !== 'object' || Array.isArray(map)) return;
      Object.keys(map).slice(0, MAX_TARGETS + 1).forEach(function (raw) {
        var key = keyOf(raw);
        if (!safeKey(key)) return;
        var value = descriptor(map[raw]);
        if (value.status === 'embedded-portable' && bounded) {
          if (totalChars + value.base64.length > 6 * 1024 * 1024 || itemCount >= 512) value = {
            status: 'route-omitted',
            mime: value.mime
          };else {
            totalChars += value.base64.length;
            itemCount += 1;
          }
        }
        assets[key] = value;
      });
    });
    var clips = needed.entries.map(function (target) {
      var asset, source;
      if (target.category === 'speech') {
        asset = assets[target.key] || {
          status: omittedLabels.indexOf(target.key) !== -1 ? 'route-omitted' : 'missing'
        };
        source = 'resource';
      } else {
        var bank = options.banks && options.banks[target.category] || host[BANKS[target.category]];
        var raw = bank && Object.prototype.hasOwnProperty.call(bank, target.key) ? bank[target.key] : null;
        if (!raw && target.category === 'letter-name') raw = host.__ALLO_INSTRUCTION_AUDIO && host.__ALLO_INSTRUCTION_AUDIO['letter_' + target.key];
        asset = raw ? descriptor(raw) : {
          status: 'online-fetch'
        };
        source = 'app-audio-bank';
        if (asset.status === 'embedded-portable') asset = Object.assign({}, asset, {
          status: 'device-only'
        });
      }
      if (asset.status === 'missing' && options.deviceCache && (options.deviceCache instanceof Map ? options.deviceCache.has(target.key) : Object.prototype.hasOwnProperty.call(options.deviceCache, target.key) && options.deviceCache[target.key])) asset = {
        status: 'device-only'
      };
      return Object.assign({}, target, asset, {
        source: source
      });
    });
    var binding;
    try {
      var content = wordsOf(deliveredResource).slice(0, MAX_WORDS).map(function (word) {
        return word && [wordOf(word), word.phonemes, word.activityItems, word.manipulationTask, word._ttsRequiredKeys, word._ttsAssets, word._ttsOmittedKeys, word._preparedActivities, word._packRevision, word._ttsVoice, word._ttsRevision, word._ttsManifest];
      });
      binding = JSON.stringify([VERSION, route, resource.id, resource.revision, resource.updatedAt, resource.data, resource.wsPreloadedWords, resource.audioManifest, resource._ttsManifest, resource._ttsVoice, resource._ttsRevision, resource._packRevision, resource.audioRevision, resource.voice, resource.selectedVoice, host.__alloSelectedVoice, resource.sessionConfig, needed.activities, content, clips.map(function (clip) {
        return [clip.id, clip.source, clip.status, clip.mime, clip.src];
      })]);
    } catch (_) {
      binding = null;
    }
    return {
      needed: needed,
      clips: clips,
      binding: binding,
      route: route,
      omittedLabels: omittedLabels
    };
  }
  function identity(resource, options) {
    return resource && resource.type === 'word-sounds' ? build(resource, options || {}).binding : null;
  }
  function inspect(resource, options) {
    if (!resource || resource.type !== 'word-sounds') return null;
    options = options || {};
    var built = build(resource, options),
      receipt = built.binding && receipts.get(built.binding),
      validation = receipt && receipt.validation || {};
    var clips = built.clips.map(function (clip) {
      var result = validation[clip.id];
      return Object.assign({}, clip, {
        status: result && result !== 'ready' ? result : clip.status,
        checked: result === 'ready' && clip.status === 'embedded-portable',
        locallyChecked: result === 'ready'
      });
    });
    var count = function (status) {
      return clips.filter(function (clip) {
        return clip.status === status;
      }).length;
    };
    var failures = clips.filter(function (clip) {
      return ['missing', 'invalid', 'unsupported', 'damaged', 'route-omitted', 'blocked'].indexOf(clip.status) !== -1;
    });
    var incomplete = clips.filter(function (clip) {
      return !clip.checked;
    });
    var omittedLabels = built.omittedLabels;
    var complete = !!built.binding && !built.needed.overflow && !built.needed.unknownActivities.length && built.needed.wordCount > 0 && clips.length > 0 && incomplete.length === 0;
    return {
      version: VERSION,
      route: built.route,
      total: clips.length,
      ready: clips.filter(function (clip) {
        return clip.checked;
      }).length,
      embedded: count('embedded-portable'),
      online: count('online-fetch'),
      deviceOnly: count('device-only'),
      missing: failures.length,
      unverified: incomplete.length,
      complete: complete,
      offlinePortable: complete,
      overflow: built.needed.overflow,
      unknownActivities: built.needed.unknownActivities,
      status: complete ? 'ready' : failures.length || built.needed.overflow || built.needed.unknownActivities.length || !built.needed.wordCount ? 'attention' : 'needs-check',
      clips: clips,
      missingLabels: failures.map(function (clip) {
        return clip.category + ': ' + clip.label;
      }),
      omittedLabels: omittedLabels,
      dependencies: clips.filter(function (clip) {
        return clip.source === 'app-audio-bank' || ['online-fetch', 'device-only'].indexOf(clip.status) !== -1;
      }).map(function (clip) {
        return clip.category + ': ' + clip.label;
      }),
      checkedAt: receipt && receipt.checkedAt || null
    };
  }
  function check(resource, options) {
    options = options || {};
    if (!resource || resource.type !== 'word-sounds') return Promise.resolve(null);
    var built = build(resource, options),
      binding = built.binding,
      run = ++serial,
      validation = Object.create(null);
    if (!binding) return Promise.resolve(inspect(resource, options));
    receipts.delete(binding);
    activeRuns.set(binding, run);
    var targets = built.clips.filter(function (clip) {
      return clip.src && ['embedded-portable', 'device-only'].indexOf(clip.status) !== -1;
    });
    var deadline = Date.now() + Math.min(30000, Math.max(1, Number(options.totalTimeoutMs) || 30000)),
      next = 0,
      checked = 0;
    var cancelled = function () {
      return options.signal && options.signal.aborted || activeRuns.get(binding) !== run;
    };
    function probe(clip) {
      return new Promise(function (resolve) {
        if (cancelled()) {
          resolve('cancelled');
          return;
        }
        var remaining = deadline - Date.now();
        if (remaining <= 0) {
          resolve('unverified');
          return;
        }
        var audio;
        try {
          audio = options.audioFactory ? options.audioFactory() : new host.Audio();
        } catch (_) {
          resolve('unsupported');
          return;
        }
        try {
          if (!audio || typeof audio.canPlayType !== 'function' || audio.canPlayType(clip.mime) === '') {
            if (audio && audio.removeAttribute) audio.removeAttribute('src');
            if (audio && audio.load) audio.load();
            resolve('unsupported');
            return;
          }
        } catch (_) {
          resolve('unsupported');
          return;
        }
        var settled = false,
          timer;
        var finish = function (status) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          audio.onloadeddata = null;
          audio.oncanplay = null;
          audio.onerror = null;
          if (options.signal) options.signal.removeEventListener('abort', cancel);
          try {
            if (audio.pause) audio.pause();
            if (audio.removeAttribute) audio.removeAttribute('src');
            if (audio.load) audio.load();
          } catch (_) {}
          resolve(status);
        };
        var cancel = function () {
          finish('cancelled');
        };
        if (options.signal) options.signal.addEventListener('abort', cancel, {
          once: true
        });
        timer = setTimeout(function () {
          finish('unverified');
        }, Math.min(4000, Math.max(1, Number(options.clipTimeoutMs) || 4000), remaining));
        var decoded = function () {
          if (audio.readyState >= 2 && Number.isFinite(audio.duration) && audio.duration > 0) finish('ready');
        };
        audio.onloadeddata = decoded;
        audio.oncanplay = decoded;
        audio.onerror = function () {
          finish('damaged');
        };
        try {
          audio.preload = 'auto';
          audio.src = clip.src;
          if (audio.load) audio.load();
        } catch (_) {
          finish('damaged');
        }
        if (cancelled()) cancel();
      });
    }
    var workers = Array.from({
      length: Math.min(4, targets.length)
    }, async function () {
      while (next < targets.length && !cancelled()) {
        var clip = targets[next++];
        validation[clip.id] = await probe(clip);
        checked += 1;
        if (!cancelled() && typeof options.onProgress === 'function') {
          try {
            options.onProgress({
              checked: checked,
              total: targets.length
            });
          } catch (_) {}
        }
      }
    });
    return Promise.all(workers).then(function () {
      var stale = identity(resource, options) !== binding;
      if (!cancelled() && !stale) {
        receipts.set(binding, {
          validation: validation,
          checkedAt: Date.now()
        });
        while (receipts.size > 2) receipts.delete(receipts.keys().next().value);
      }
      var aborted = cancelled();
      if (activeRuns.get(binding) === run) activeRuns.delete(binding);
      var report = inspect(resource, options);
      return Object.assign({}, report, {
        cancelled: !!aborted,
        stale: stale
      });
    });
  }
  return {
    VERSION: VERSION,
    descriptor: descriptor,
    portable: portable,
    requirements: requirements,
    identity: identity,
    inspect: inspect,
    check: check
  };
});
function WordSoundsPreviewView(props) {
  function label(key, fallback, values) {
    var fullKey = 'word_sounds.' + key;
    var translated = typeof props.t === 'function' ? props.t(fullKey, values || {}) : '';
    var text = typeof translated === 'string' && translated && translated !== fullKey ? translated : fallback;
    return text.replace(/\{(\w+)\}/g, function (match, name) {
      return values && values[name] != null ? String(values[name]) : match;
    });
  }
  var generatedContent = props.generatedContent;
  var wsActivitySequence = props.wsActivitySequence;
  var setWordSoundsActivity = props.setWordSoundsActivity;
  var setIsWordSoundsMode = props.setIsWordSoundsMode;
  var setWordSoundsAutoReview = props.setWordSoundsAutoReview;
  var prepareWordSoundsSession = props.prepareWordSoundsSession;
  var wordSoundsAudioCoverage = props.wordSoundsAudioCoverage;
  var requestIncompleteAudioConfirmation = props.requestIncompleteAudioConfirmation;
  var missingAudioLabels = wordSoundsAudioCoverage && Array.isArray(wordSoundsAudioCoverage.missingLabels) ? wordSoundsAudioCoverage.missingLabels : wordSoundsAudioCoverage && Array.isArray(wordSoundsAudioCoverage.missingWords) ? wordSoundsAudioCoverage.missingWords : [];
  // Treat an omitted role as the educator view so older call sites retain the
  // review path. Learner call sites pass false explicitly.
  var isTeacherMode = props.isTeacherMode !== false;
  var readinessApi = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.WordSoundsReadiness;
  var readinessResource = React.useMemo(function () {
    return generatedContent && Object.assign({}, generatedContent, {
      lessonPlanSequence: Array.isArray(wsActivitySequence) && wsActivitySequence.length ? wsActivitySequence : generatedContent.lessonPlanSequence
    });
  }, [generatedContent, wsActivitySequence]);
  var readinessBinding = readinessApi ? readinessApi.identity(readinessResource, {
    route: 'student-pack'
  }) : null;
  var readinessRunRef = React.useRef({
    binding: readinessBinding,
    controller: null,
    mounted: true,
    epoch: 0
  });
  var readinessCheckButtonRef = React.useRef(null);
  var readinessCancelButtonRef = React.useRef(null);
  var readinessPanelRef = React.useRef(null);
  var readinessState = React.useState({
    busy: false,
    notice: ''
  });
  var readinessStateValue = readinessState[0],
    setReadinessState = readinessState[1];
  var readinessMatches = readinessRunRef.current.binding === readinessBinding;
  var readinessBusy = readinessMatches && readinessStateValue.busy;
  var readinessNotice = readinessMatches ? readinessStateValue.notice : '';
  React.useEffect(function () {
    var current = readinessRunRef.current;
    if (current.controller) current.controller.abort();
    current.binding = readinessBinding;
    current.controller = null;
    current.mounted = true;
    current.epoch += 1;
    setReadinessState({
      busy: false,
      notice: ''
    });
    return function () {
      current.mounted = false;
      current.epoch += 1;
      if (current.controller) current.controller.abort();
    };
  }, [readinessBinding]);
  React.useEffect(function () {
    if (typeof document === 'undefined') return;
    var active = document.activeElement;
    if (active && active !== document.body && !(readinessPanelRef.current && readinessPanelRef.current.contains(active))) return;
    var target = readinessBusy ? readinessCancelButtonRef.current : readinessNotice && readinessCheckButtonRef.current;
    if (target) target.focus();
  }, [readinessBusy, readinessNotice]);
  wordSoundsAudioCoverage = readinessApi ? readinessApi.inspect(readinessResource, {
    route: 'student-pack'
  }) : {
    ready: 0,
    total: wordSoundsAudioCoverage && wordSoundsAudioCoverage.total || 0,
    missing: 0,
    embedded: 0,
    online: 0,
    deviceOnly: 0,
    unverified: 1,
    complete: false,
    dependencies: [],
    missingLabels: []
  };
  missingAudioLabels = wordSoundsAudioCoverage && wordSoundsAudioCoverage.missingLabels || [];
  var readinessCategoryNames = {
    "speech": label('readiness_category_speech', 'Words and text'),
    "phoneme": label('readiness_category_phoneme', 'Speech sounds'),
    "instruction": label('readiness_category_instruction', 'Instructions'),
    "feedback": label('readiness_category_feedback', 'Feedback'),
    "isolation": label('readiness_category_isolation', 'Sound position prompts'),
    "letter-name": label('readiness_category_letter_name', 'Letter names')
  };
  var readableAudioLabel = function (value) {
    var parts = String(value || '').split(': '),
      category = parts.shift(),
      name = parts.join(': ');
    if (category === 'instruction' || category === 'feedback') name = name.replace(/^(inst_|fb_)/, '').replace(/_/g, ' ');
    return (readinessCategoryNames[category] || category) + ': ' + name;
  };
  var checkReadiness = function () {
    var current = readinessRunRef.current;
    if (!readinessApi || !readinessResource || current.controller || !current.mounted) return;
    var controller = new AbortController(),
      epoch = ++current.epoch,
      binding = readinessBinding;
    current.controller = controller;
    setReadinessState({
      busy: true,
      notice: ''
    });
    readinessApi.check(readinessResource, {
      route: 'student-pack',
      signal: controller.signal
    }).then(function (report) {
      if (!current.mounted || current.epoch !== epoch || current.binding !== binding) return;
      current.controller = null;
      setReadinessState({
        busy: false,
        notice: report && !report.cancelled && !report.stale ? 'checked' : 'cancelled'
      });
    }).catch(function () {
      if (!current.mounted || current.epoch !== epoch || current.binding !== binding) return;
      current.controller = null;
      setReadinessState({
        busy: false,
        notice: 'failed'
      });
    });
  };
  var cancelReadiness = function () {
    var current = readinessRunRef.current;
    current.epoch += 1;
    if (current.controller) current.controller.abort();
    current.controller = null;
    setReadinessState({
      busy: false,
      notice: 'cancelled'
    });
  };
  // A missing-audio confirmation can outlive the resource that opened it.
  // Keep its callback tied to the exact prepared lesson and allow one launch.
  var launchContext = JSON.stringify([generatedContent && generatedContent.id, generatedContent && generatedContent.sessionConfig, generatedContent && generatedContent.data, generatedContent && generatedContent.wsPreloadedWords, wsActivitySequence, isTeacherMode]);
  var launchRef = React.useRef({
    context: launchContext,
    launched: false,
    mounted: true
  });
  if (launchRef.current.context !== launchContext) launchRef.current = {
    context: launchContext,
    launched: false,
    mounted: true
  };
  React.useEffect(function () {
    launchRef.current.mounted = true;
    return function () {
      launchRef.current.mounted = false;
    };
  }, []);
  var claimLaunch = function () {
    var current = launchRef.current;
    if (!current.mounted || current.context !== launchContext || current.launched) return false;
    current.launched = true;
    return true;
  };
  var launchErrorState = React.useState('');
  var launchError = launchErrorState[0],
    setLaunchError = launchErrorState[1];
  var launchPreparedActivity = function () {
    if (!claimLaunch()) return;
    setLaunchError('');
    try {
      var initialActivity = wsActivitySequence && wsActivitySequence.length > 0 ? wsActivitySequence[0] : 'counting';
      if (typeof prepareWordSoundsSession === 'function') {
        prepareWordSoundsSession({
          ...(generatedContent?.sessionConfig || {}),
          resourceId: generatedContent?.id || null,
          initialActivity
        });
      }
      setWordSoundsActivity(initialActivity);
      setWordSoundsAutoReview(false);
      setIsWordSoundsMode(true);
    } catch (_) {
      launchRef.current.launched = false;
      setLaunchError(label('preview_launch_failed', 'The activity could not open. Please try again.'));
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, launchError && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
  }, launchError), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-violet-50 to-indigo-50 p-6 rounded-2xl border border-violet-200 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-4xl mb-3"
  }, "🎵"), /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-slate-800 mb-2"
  }, generatedContent?.title || label('preview_title', 'Word Sounds Studio')), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 mb-1"
  }, generatedContent?.configSummary || label('preview_ready', 'Ready to practice')), generatedContent?.data && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-violet-700 font-medium"
  }, label('preview_word_count', '{count} words loaded', {
    count: generatedContent.data.length
  })), isTeacherMode && wordSoundsAudioCoverage && /*#__PURE__*/React.createElement("section", {
    ref: readinessPanelRef,
    className: "mt-4 rounded-xl border border-violet-200 bg-white p-4 text-start",
    "aria-label": label('readiness_panel', 'Ready for students: audio check'),
    "aria-busy": readinessBusy,
    onKeyDown: event => {
      if (event.key === 'Escape' && readinessBusy) {
        event.preventDefault();
        cancelReadiness();
      }
    }
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-slate-800"
  }, label('readiness_heading', 'Ready for students'), " ", /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium"
  }, label('readiness_audio_qualifier', 'Audio check'))), /*#__PURE__*/React.createElement("p", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: `mt-2 text-sm font-bold ${wordSoundsAudioCoverage.complete ? 'text-emerald-700' : 'text-amber-800'}`
  }, readinessBusy ? label('readiness_checking', 'Checking local clips. This may take up to 30 seconds.') : wordSoundsAudioCoverage.complete ? label('readiness_ready', 'Audio verified for this student pack') : label('readiness_review', 'Audio needs checking or review'), !readinessBusy && readinessNotice === 'cancelled' && /*#__PURE__*/React.createElement("span", {
    className: "block"
  }, label('readiness_cancelled', 'Audio check cancelled. Readiness is unconfirmed.')), !readinessBusy && readinessNotice === 'failed' && /*#__PURE__*/React.createElement("span", {
    className: "block"
  }, label('readiness_failed', 'Audio could not be checked. Review the lesson and try again.'))), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-sm text-slate-700"
  }, label('readiness_counts', '{ready}/{total} required clips verified; {embedded} embedded, {online} online dependencies, {deviceOnly} available only on this device.', wordSoundsAudioCoverage)), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-xs text-slate-600"
  }, label('readiness_limits', 'This checks audio only. Review the lesson content before sharing. Online app banks and device cache are not embedded in the student pack; this check cannot confirm them on another device.')), missingAudioLabels.length > 0 && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-sm text-amber-900"
  }, label('preview_missing', 'Missing: {labels}', {
    labels: missingAudioLabels.slice(0, 5).map(readableAudioLabel).join(', ')
  }), missingAudioLabels.length > 5 && label('preview_more', ', plus {count} more', {
    count: missingAudioLabels.length - 5
  })), wordSoundsAudioCoverage.dependencies && wordSoundsAudioCoverage.dependencies.length > 0 && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-sm text-slate-700"
  }, label('readiness_dependencies', 'App or device audio to review: {labels}', {
    labels: wordSoundsAudioCoverage.dependencies.slice(0, 5).map(readableAudioLabel).join(', ')
  }), wordSoundsAudioCoverage.dependencies.length > 5 && label('preview_more', ', plus {count} more', {
    count: wordSoundsAudioCoverage.dependencies.length - 5
  })), wordSoundsAudioCoverage.omittedLabels && wordSoundsAudioCoverage.omittedLabels.length > 0 && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-sm text-amber-900"
  }, label('readiness_omitted', 'Prepared clips omitted from delivery: {labels}', {
    labels: wordSoundsAudioCoverage.omittedLabels.slice(0, 5).join(', ')
  }), wordSoundsAudioCoverage.omittedLabels.length > 5 && label('preview_more', ', plus {count} more', {
    count: wordSoundsAudioCoverage.omittedLabels.length - 5
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    ref: readinessCheckButtonRef,
    type: "button",
    onClick: checkReadiness,
    disabled: readinessBusy || !readinessApi,
    className: "min-h-11 rounded-lg border border-violet-300 px-4 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2"
  }, label('readiness_check', 'Check prepared audio')), readinessBusy && /*#__PURE__*/React.createElement("button", {
    ref: readinessCancelButtonRef,
    type: "button",
    onClick: cancelReadiness,
    className: "min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2"
  }, label('readiness_cancel', 'Cancel check'))), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-xs text-slate-600"
  }, label('readiness_recovery', 'For missing embedded clips, use Teacher: Review Words & Audio, then re-prepare the pack in setup. Starting or reviewing a session follows the existing session controls.'))), /*#__PURE__*/React.createElement("div", {
    className: `grid grid-cols-1 ${isTeacherMode ? 'sm:grid-cols-2' : ''} gap-3 mt-5`
  }, isTeacherMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      if (!claimLaunch()) return;
      const initialActivity = wsActivitySequence && wsActivitySequence.length > 0 ? wsActivitySequence[0] : 'counting';
      if (typeof prepareWordSoundsSession === 'function') {
        prepareWordSoundsSession({
          ...(generatedContent?.sessionConfig || {}),
          resourceId: generatedContent?.id || null,
          initialActivity
        });
      }
      setWordSoundsActivity(initialActivity);
      setIsWordSoundsMode(true);
      setWordSoundsAutoReview(true);
    },
    className: "min-h-14 flex items-center justify-center gap-3 px-5 py-3 bg-white text-violet-800 font-bold rounded-xl border-2 border-violet-300 hover:bg-violet-100 hover:border-violet-500 shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2"
  }, /*#__PURE__*/React.createElement(BookOpen, {
    size: 20,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-start"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block"
  }, label('preview_teacher_review', 'Teacher: Review Words & Audio')), /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-medium text-violet-600"
  }, label('preview_teacher_hint', 'Check or edit the lesson before students begin')))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      if (isTeacherMode && wordSoundsAudioCoverage && !wordSoundsAudioCoverage.complete && typeof requestIncompleteAudioConfirmation === 'function') {
        requestIncompleteAudioConfirmation(wordSoundsAudioCoverage, launchPreparedActivity);
        return;
      }
      // Honor the lesson-plan sequence exactly like the
      // Review button above — 'counting' is only the
      // no-sequence fallback.
      launchPreparedActivity();
    },
    className: "min-h-14 flex items-center justify-center gap-3 px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all motion-safe:hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2"
  }, /*#__PURE__*/React.createElement(Play, {
    size: 20,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-start"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block"
  }, isTeacherMode ? label('preview_student_practice', 'Student: Start Practice') : label('preview_start', 'Start Activity')), /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-medium text-indigo-100"
  }, label('preview_start_hint', 'Begin the prepared activities now')))))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.WordSoundsPreviewView = WordSoundsPreviewView;
  window.AlloModules.ViewWordSoundsPreviewModule = true;
})();
