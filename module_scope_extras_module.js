(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ModuleScopeExtras) { console.log('[CDN] ModuleScopeExtrasModule already loaded, skipping'); return; }
var React = window.React || React;
var LanguageContext = window.AlloLanguageContext;
// Firestore deps mirrored to window by host (see AlloFlowANTI.txt
// where window.doc / window.db / window.setDoc / window.getDoc are set
// alongside the existing window._fbDoc / window._fbDb pair).
var doc = window.doc || window._fbDoc;
var db = window.db || window._fbDb;
var setDoc = window.setDoc || window._fbSetDoc;
var getDoc = window.getDoc || window._fbGetDoc;
var warnLog = (typeof window !== 'undefined' && window.warnLog) || console.warn.bind(console);
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
var AlertCircle = _lazyIcon('AlertCircle');
var RefreshCw = _lazyIcon('RefreshCw');
(function (root, factory) {
  if (root && root.window) root = root.window;
  var existing = root && root.AlloModules && root.AlloModules.WordSoundsReadiness;
  var api = existing && existing.VERSION === 3 && typeof existing.portable === 'function' ? existing : factory(root || {});
  if (root) { root.AlloModules = root.AlloModules || {}; root.AlloModules.WordSoundsReadiness = api; }
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (host) {
  'use strict';
  var VERSION = 3, MAX_TARGETS = 1024, MAX_WORDS = 200, MAX_CLIP_CHARS = 512 * 1024;
  var INST = { decoding: 'decoding', orthography: 'inst_orthography', spelling_bee: 'inst_spelling_bee', word_scramble: 'inst_word_scramble', missing_letter: 'inst_missing_letter', counting: 'inst_counting', blending: 'inst_blending', segmentation: 'inst_segmentation', mapping: 'mapping', syllable_blending: 'inst_syllable_blending', syllable_counting: 'inst_syllable_counting' };
  var FEEDBACK = ['fb_try_again_listen', 'fb_almost', 'fb_amazing', 'fb_on_fire', 'fb_excellent', 'fb_wow', 'fb_you_got_it', 'fb_great_job', 'fb_nice', 'fb_keep_going', 'fb_way_to_go', 'fb_perfect', 'fb_correct'];
  var BANKS = { phoneme: '__ALLO_PHONEME_AUDIO_BANK', instruction: '__ALLO_INSTRUCTION_AUDIO', feedback: '__ALLO_INSTRUCTION_AUDIO', isolation: '__ALLO_ISOLATION_AUDIO', 'letter-name': '__ALLO_LETTER_NAME_AUDIO_BANK' };
  var receipts = new Map(), activeRuns = new Map(), serial = 0;
  var keyOf = function (value) { return typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, ' ') : ''; };
  var wordOf = function (item) { return keyOf(item && (item.targetWord || item.word || item.term || item.singleWord || item.displayWord)); };
  var safeKey = function (key) { return key && key.length <= 240 && !/[\u0000-\u001f\u007f]/.test(key); };
  var wordsOf = function (resource) { return resource && Array.isArray(resource.wsPreloadedWords) && resource.wsPreloadedWords.length ? resource.wsPreloadedWords : (resource && Array.isArray(resource.data) ? resource.data : []); };
  function descriptor(asset) {
    var mime, base64;
    if (typeof asset === 'string') {
      var match = asset.match(/^data:(audio\/[a-z0-9.+-]+);base64,([\s\S]+)$/i);
      if (!match) return { status: /^https:\/\/[^\s]+$/i.test(asset) ? 'online-fetch' : (/^blob:/i.test(asset) ? 'device-only' : 'invalid') };
      mime = match[1]; base64 = match[2];
    } else if (asset && typeof asset === 'object' && !Array.isArray(asset)) { mime = asset.mime; base64 = asset.base64; }
    else return { status: 'missing' };
    mime = keyOf(mime); base64 = typeof base64 === 'string' ? base64.replace(/\s/g, '') : '';
    if (!/^audio\/(?:mpeg|mp3|wav|x-wav|wave|ogg|webm|mp4|x-m4a|aac|flac)$/.test(mime)) return { status: 'unsupported', mime: mime };
    if (!base64 || base64.length > MAX_CLIP_CHARS || base64.length % 4 !== 0 || !/^(?:[a-z0-9+/]{4})*(?:[a-z0-9+/]{2}==|[a-z0-9+/]{3}=)?$/i.test(base64)) return { status: 'invalid', mime: mime };
    var bytes;
    try {
      if (typeof atob === 'function') { bytes = atob(base64); if (typeof btoa === 'function' && btoa(bytes) !== base64) return { status: 'invalid', mime: mime }; }
      else if (typeof Buffer !== 'undefined') { var buffer = Buffer.from(base64, 'base64'); if (buffer.toString('base64') !== base64) return { status: 'invalid', mime: mime }; bytes = buffer.toString('binary'); }
      else return { status: 'unverified', mime: mime };
    } catch (_) { return { status: 'invalid', mime: mime }; }
    var at = function (i) { return bytes.charCodeAt(i); };
    var wav = bytes.length > 44 && bytes.slice(0, 4) === 'RIFF' && bytes.slice(8, 12) === 'WAVE';
    var mp3 = bytes.length > 10 && (bytes.slice(0, 3) === 'ID3' && at(3) >= 2 && at(3) <= 4 || at(0) === 255 && (at(1) & 224) === 224 && (at(1) & 6) !== 0);
    var aac = bytes.length > 7 && at(0) === 255 && (at(1) & 246) === 240;
    var ogg = bytes.length > 27 && bytes.slice(0, 4) === 'OggS' && at(4) === 0;
    var webm = bytes.length > 8 && at(0) === 26 && at(1) === 69 && at(2) === 223 && at(3) === 163;
    var mp4 = bytes.length > 12 && bytes.slice(4, 8) === 'ftyp';
    var flac = bytes.length > 8 && bytes.slice(0, 4) === 'fLaC';
    var valid = /wav|wave/.test(mime) ? wav : (/mpeg|mp3/.test(mime) ? mp3 : (mime === 'audio/aac' ? aac : (/ogg/.test(mime) ? ogg : (/webm/.test(mime) ? webm : (/flac/.test(mime) ? flac : mp4)))));
    if (!valid) return { status: 'invalid', mime: mime };
    return { status: 'embedded-portable', mime: mime, base64: base64, src: 'data:' + mime + ';base64,' + base64 };
  }
  function portable(resource) {
    if (!resource || resource.type !== 'word-sounds' || !Array.isArray(resource.data) && !Array.isArray(resource.wsPreloadedWords)) return resource;
    var normalized = Object.assign({}, resource);
    ['wsPreloadedWords', 'data'].forEach(function (layout) {
      if (Array.isArray(resource[layout])) normalized[layout] = resource[layout].map(function (word) { return word && typeof word === 'object' && !Array.isArray(word) ? Object.assign({}, word) : word; });
    });
    {
        let remainingAudioChars = 6 * 1024 * 1024;
        let remainingAudioItems = 512;
        const omittedAudioKeys = new Set();
        const safeTtsKey = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240);
        const recordOmittedTtsKey = (key, omittedKeys) => {
            if (!key || (!omittedAudioKeys.has(key) && omittedAudioKeys.size >= 512)) return;
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
                const asset = dataAudio ? { mime: dataAudio[1], base64: dataAudio[2] } : rawAsset;
                const mime = asset && typeof asset === 'object' && !Array.isArray(asset) ? String(asset.mime || '').trim().toLowerCase() : '';
                const base64 = asset && typeof asset.base64 === 'string' ? asset.base64.replace(/\s+/g, '') : '';
                if (!/^audio\/[a-z0-9.+-]{1,48}$/i.test(mime)
                    || !base64 || base64.length > 512 * 1024 || base64.length > remainingAudioChars || remainingAudioItems <= 0
                    || !/^[a-z0-9+/]+={0,2}$/i.test(base64) || base64.length % 4 === 1
                    || (base64.includes('=') && base64.length % 4 !== 0)) {
                    recordOmittedTtsKey(key, omittedKeys);
                    continue;
                }
                if (Object.prototype.hasOwnProperty.call(safeAssets, key)) {
                    recordOmittedTtsKey(key, omittedKeys);
                    continue;
                }
                safeAssets[key] = { mime, base64 };
                remainingAudioChars -= base64.length;
                remainingAudioItems -= 1;
            }
            return Object.keys(safeAssets).length > 0 ? safeAssets : null;
        };
        const safeRequiredTtsKeys = (value) => {
            if (!Array.isArray(value)) return null;
            const keys = Array.from(new Set(value
                .map(safeTtsKey)
                .filter(Boolean)))
                .slice(0, 1024);
            return keys.length > 0 ? keys : null;
        };
        ['wsPreloadedWords', 'data'].forEach(layout => {
          if (!Array.isArray(resource[layout]) || !Array.isArray(normalized[layout])) return;
          resource[layout].forEach((sourceWord, wordIndex) => {
            const packedWord = normalized[layout][wordIndex];
            if (!sourceWord || !packedWord || typeof packedWord !== 'object' || Array.isArray(sourceWord) || Array.isArray(packedWord)) return;
            const omittedKeys = new Set();
            const safeAssets = safePortableTtsAssets(sourceWord._ttsAssets, omittedKeys);
            if (safeAssets) packedWord._ttsAssets = safeAssets;
            else delete packedWord._ttsAssets;
            const targetWord = sourceWord.targetWord || sourceWord.word || sourceWord.term || sourceWord.singleWord || sourceWord.displayWord;
            const requiredKeys = safeRequiredTtsKeys([targetWord, ...(Array.isArray(sourceWord._ttsRequiredKeys) ? sourceWord._ttsRequiredKeys : [])]);
            if (requiredKeys) packedWord._ttsRequiredKeys = requiredKeys;
            else delete packedWord._ttsRequiredKeys;
            const priorOmittedKeys = safeRequiredTtsKeys(sourceWord._ttsOmittedKeys) || [];
            priorOmittedKeys.forEach(key => recordOmittedTtsKey(key, omittedKeys));
            const unresolvedOmittedKeys = Array.from(omittedKeys).filter(key => !safeAssets || !Object.prototype.hasOwnProperty.call(safeAssets, key));
            if (unresolvedOmittedKeys.length) packedWord._ttsOmittedKeys = unresolvedOmittedKeys;
            else delete packedWord._ttsOmittedKeys;
          });
        });
    }
    return normalized;
  }
  function requirements(resource) {
    var entries = new Map(), overflow = false, unknownActivities = [];
    var add = function (label, category) {
      var key = keyOf(label), id = category + ':' + key;
      if (!key || entries.has(id)) return;
      if (!safeKey(key) || entries.size >= MAX_TARGETS) { overflow = true; return; }
      entries.set(id, { id: id, key: key, category: category, label: key });
    };
    var sound = function (value) { add(typeof value === 'string' ? value.replace(/^\/+|\/+$/g, '') : '', 'phoneme'); };
    var words = wordsOf(resource), config = resource && resource.sessionConfig || {};
    var sequence = resource && resource.lessonPlanSequence || config.activitySequence;
    var activities = Array.isArray(sequence) && sequence.length ? sequence : (config.initialActivity ? [config.initialActivity] : []);
    if (!activities.length) activities = Array.from(new Set(words.flatMap(function (item) { return item && Array.isArray(item._preparedActivities) ? item._preparedActivities : []; })));
    if (!activities.length) activities = ['counting'];
    activities = Array.from(new Set(activities));
    var known = Object.keys(INST).concat(['isolation', 'rhyming', 'manipulation', 'letter_tracing', 'sound_sort', 'word_families', 'decoding', 'read_sentence', 'read_passage', 'sentence_match']);
    activities.forEach(function (activity) { if (known.indexOf(activity) === -1) unknownActivities.push(String(activity)); });
    words.slice(0, MAX_WORDS).forEach(function (item) {
      if (!item || typeof item !== 'object' || !wordOf(item)) { overflow = true; return; }
      add(wordOf(item), 'speech');
      (Array.isArray(item._ttsRequiredKeys) ? item._ttsRequiredKeys : []).slice(0, MAX_TARGETS + 1).forEach(function (key) { add(key, 'speech'); });
      if (item._ttsRequiredKeys && item._ttsRequiredKeys.length > MAX_TARGETS) overflow = true;
      var boards = item.activityItems || {};
      activities.forEach(function (activity) {
        var board = boards[activity] || {};
        var fieldMap = { blending: ['options'], rhyming: ['options'], manipulation: ['options'], syllable_blending: ['syllables', 'options'], syllable_counting: ['syllables'], orthography: ['options'], sound_sort: ['options', 'distractors'], word_families: ['options', 'distractors'], decoding: ['choices'], read_sentence: ['options'], read_passage: ['options'], sentence_match: ['sequence', 'extras'] };
        (fieldMap[activity] || []).forEach(function (field) { (Array.isArray(board[field]) ? board[field] : []).forEach(function (value) { add(value, 'speech'); }); });
        if (['blending', 'segmentation', 'isolation', 'counting', 'mapping'].indexOf(activity) !== -1) (Array.isArray(item.phonemes) ? item.phonemes : []).forEach(sound);
        if (activity === 'isolation') {
          (Array.isArray(board.options) ? board.options : []).forEach(sound);
          var ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
          var position = board.position;
          if (typeof position === 'number') add(ordinals[position] || '', 'isolation');
          else if (position) add(({ first: '1st', middle: 'middle', last: 'last' })[position] || position, 'isolation');
          else add('unknown-position', 'isolation');
        }
        if (activity === 'segmentation') (Array.isArray(board.chips) ? board.chips : []).forEach(function (chip) { sound(chip && chip.phoneme); });
        if (activity === 'mapping') (Array.isArray(board.chipOrder) ? board.chipOrder : []).forEach(function (chip) { sound(chip && chip.text); });
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
          String(board.story || '').split(/(?<=[.!?])\s+/).forEach(function (line) { add(line, 'speech'); });
          add('Read the story. Which word finishes it?', 'speech');
        }
        if (activity === 'manipulation') {
          String(board.task && board.task.instruction || item.manipulationTask && item.manipulationTask.instruction || '').split(/(\/[^\s/]{1,4}\/)/g).forEach(function (part) { if (/^\/[^/]+\/$/.test(part.trim())) sound(part.trim()); else if (/[a-z0-9]/i.test(part)) add(part, 'speech'); });
        }
        if (activity === 'letter_tracing') { ['trace_letter', 'for', 'now_try_lowercase'].forEach(function (key) { add(key, 'instruction'); }); add(wordOf(item).slice(0, 1), 'letter-name'); }
        if (activity === 'sound_sort') { add(board.mode === 'last' ? 'sound_match_end' : 'sound_match_start', 'instruction'); add('as_in', 'instruction'); sound(board.targetChar); if (!board.targetChar) overflow = true; }
        if (activity === 'word_families') { if (board.rime) add('Find all words in the ' + board.rime + ' family', 'speech'); else overflow = true; }
      });
    });
    if (words.length > MAX_WORDS) overflow = true;
    if (words.length && !(resource && resource.isProbeMode)) FEEDBACK.forEach(function (key) { add(key, 'feedback'); });
    return { entries: Array.from(entries.values()), activities: activities, overflow: overflow, unknownActivities: unknownActivities, wordCount: words.length };
  }
  function build(resource, options) {
    var route = options.route || 'student-pack', bounded = route === 'student-pack' || route === 'mailbox';
    var deliveredResource = bounded ? portable(resource) : resource;
    var needed = requirements(deliveredResource), assets = Object.create(null), totalChars = 0, itemCount = 0;
    var selectedWords = wordsOf(deliveredResource).slice(0, MAX_WORDS);
    var deliveredWords = selectedWords;
    var omittedLabels = Array.from(new Set(deliveredWords.flatMap(function (word) { return word && Array.isArray(word._ttsOmittedKeys) ? word._ttsOmittedKeys : []; }).map(keyOf).filter(safeKey))).slice(0, 512);
    deliveredWords.forEach(function (word) {
      var map = word && word._ttsAssets;
      if (!map || typeof map !== 'object' || Array.isArray(map)) return;
      Object.keys(map).slice(0, MAX_TARGETS + 1).forEach(function (raw) {
        var key = keyOf(raw); if (!safeKey(key)) return;
        var value = descriptor(map[raw]);
        if (value.status === 'embedded-portable' && bounded) {
          if (totalChars + value.base64.length > 6 * 1024 * 1024 || itemCount >= 512) value = { status: 'route-omitted', mime: value.mime };
          else { totalChars += value.base64.length; itemCount += 1; }
        }
        assets[key] = value;
      });
    });
    var clips = needed.entries.map(function (target) {
      var asset, source;
      if (target.category === 'speech') { asset = assets[target.key] || { status: omittedLabels.indexOf(target.key) !== -1 ? 'route-omitted' : 'missing' }; source = 'resource'; }
      else {
        var bank = options.banks && options.banks[target.category] || host[BANKS[target.category]];
        var raw = bank && Object.prototype.hasOwnProperty.call(bank, target.key) ? bank[target.key] : null;
        if (!raw && target.category === 'letter-name') raw = host.__ALLO_INSTRUCTION_AUDIO && host.__ALLO_INSTRUCTION_AUDIO['letter_' + target.key];
        asset = raw ? descriptor(raw) : { status: 'online-fetch' };
        source = 'app-audio-bank';
        if (asset.status === 'embedded-portable') asset = Object.assign({}, asset, { status: 'device-only' });
      }
      if (asset.status === 'missing' && options.deviceCache && (options.deviceCache instanceof Map ? options.deviceCache.has(target.key) : Object.prototype.hasOwnProperty.call(options.deviceCache, target.key) && options.deviceCache[target.key])) asset = { status: 'device-only' };
      return Object.assign({}, target, asset, { source: source });
    });
    var binding;
    try {
      var content = wordsOf(deliveredResource).slice(0, MAX_WORDS).map(function (word) { return word && [wordOf(word), word.phonemes, word.activityItems, word.manipulationTask, word._ttsRequiredKeys, word._ttsAssets, word._ttsOmittedKeys, word._preparedActivities, word._packRevision, word._ttsVoice, word._ttsRevision, word._ttsManifest]; });
      binding = JSON.stringify([VERSION, route, resource.id, resource.revision, resource.updatedAt, resource.data, resource.wsPreloadedWords, resource.audioManifest, resource._ttsManifest, resource._ttsVoice, resource._ttsRevision, resource._packRevision, resource.audioRevision, resource.voice, resource.selectedVoice, host.__alloSelectedVoice, resource.sessionConfig, needed.activities, content, clips.map(function (clip) { return [clip.id, clip.source, clip.status, clip.mime, clip.src]; })]);
    } catch (_) { binding = null; }
    return { needed: needed, clips: clips, binding: binding, route: route, omittedLabels: omittedLabels };
  }
  function identity(resource, options) { return resource && resource.type === 'word-sounds' ? build(resource, options || {}).binding : null; }
  function inspect(resource, options) {
    if (!resource || resource.type !== 'word-sounds') return null;
    options = options || {};
    var built = build(resource, options), receipt = built.binding && receipts.get(built.binding), validation = receipt && receipt.validation || {};
    var clips = built.clips.map(function (clip) {
      var result = validation[clip.id];
      return Object.assign({}, clip, { status: result && result !== 'ready' ? result : clip.status, checked: result === 'ready' && clip.status === 'embedded-portable', locallyChecked: result === 'ready' });
    });
    var count = function (status) { return clips.filter(function (clip) { return clip.status === status; }).length; };
    var failures = clips.filter(function (clip) { return ['missing', 'invalid', 'unsupported', 'damaged', 'route-omitted', 'blocked'].indexOf(clip.status) !== -1; });
    var incomplete = clips.filter(function (clip) { return !clip.checked; });
    var omittedLabels = built.omittedLabels;
    var complete = !!built.binding && !built.needed.overflow && !built.needed.unknownActivities.length && built.needed.wordCount > 0 && clips.length > 0 && incomplete.length === 0;
    return { version: VERSION, route: built.route, total: clips.length, ready: clips.filter(function (clip) { return clip.checked; }).length, embedded: count('embedded-portable'), online: count('online-fetch'), deviceOnly: count('device-only'), missing: failures.length, unverified: incomplete.length, complete: complete, offlinePortable: complete, overflow: built.needed.overflow, unknownActivities: built.needed.unknownActivities, status: complete ? 'ready' : (failures.length || built.needed.overflow || built.needed.unknownActivities.length || !built.needed.wordCount ? 'attention' : 'needs-check'), clips: clips, missingLabels: failures.map(function (clip) { return clip.category + ': ' + clip.label; }), omittedLabels: omittedLabels, dependencies: clips.filter(function (clip) { return clip.source === 'app-audio-bank' || ['online-fetch', 'device-only'].indexOf(clip.status) !== -1; }).map(function (clip) { return clip.category + ': ' + clip.label; }), checkedAt: receipt && receipt.checkedAt || null };
  }
  function check(resource, options) {
    options = options || {};
    if (!resource || resource.type !== 'word-sounds') return Promise.resolve(null);
    var built = build(resource, options), binding = built.binding, run = ++serial, validation = Object.create(null);
    if (!binding) return Promise.resolve(inspect(resource, options));
    receipts.delete(binding); activeRuns.set(binding, run);
    var targets = built.clips.filter(function (clip) { return clip.src && ['embedded-portable', 'device-only'].indexOf(clip.status) !== -1; });
    var deadline = Date.now() + Math.min(30000, Math.max(1, Number(options.totalTimeoutMs) || 30000)), next = 0, checked = 0;
    var cancelled = function () { return options.signal && options.signal.aborted || activeRuns.get(binding) !== run; };
    function probe(clip) {
      return new Promise(function (resolve) {
        if (cancelled()) { resolve('cancelled'); return; }
        var remaining = deadline - Date.now(); if (remaining <= 0) { resolve('unverified'); return; }
        var audio;
        try { audio = options.audioFactory ? options.audioFactory() : new host.Audio(); } catch (_) { resolve('unsupported'); return; }
        try {
          if (!audio || typeof audio.canPlayType !== 'function' || audio.canPlayType(clip.mime) === '') {
            if (audio && audio.removeAttribute) audio.removeAttribute('src');
            if (audio && audio.load) audio.load();
            resolve('unsupported'); return;
          }
        } catch (_) { resolve('unsupported'); return; }
        var settled = false, timer;
        var finish = function (status) {
          if (settled) return; settled = true; clearTimeout(timer);
          audio.onloadeddata = null; audio.oncanplay = null; audio.onerror = null;
          if (options.signal) options.signal.removeEventListener('abort', cancel);
          try { if (audio.pause) audio.pause(); if (audio.removeAttribute) audio.removeAttribute('src'); if (audio.load) audio.load(); } catch (_) {}
          resolve(status);
        };
        var cancel = function () { finish('cancelled'); };
        if (options.signal) options.signal.addEventListener('abort', cancel, { once: true });
        timer = setTimeout(function () { finish('unverified'); }, Math.min(4000, Math.max(1, Number(options.clipTimeoutMs) || 4000), remaining));
        var decoded = function () { if (audio.readyState >= 2 && Number.isFinite(audio.duration) && audio.duration > 0) finish('ready'); };
        audio.onloadeddata = decoded; audio.oncanplay = decoded; audio.onerror = function () { finish('damaged'); };
        try { audio.preload = 'auto'; audio.src = clip.src; if (audio.load) audio.load(); } catch (_) { finish('damaged'); }
        if (cancelled()) cancel();
      });
    }
    var workers = Array.from({ length: Math.min(4, targets.length) }, async function () {
      while (next < targets.length && !cancelled()) {
        var clip = targets[next++]; validation[clip.id] = await probe(clip); checked += 1;
        if (!cancelled() && typeof options.onProgress === 'function') { try { options.onProgress({ checked: checked, total: targets.length }); } catch (_) {} }
      }
    });
    return Promise.all(workers).then(function () {
      var stale = identity(resource, options) !== binding;
      if (!cancelled() && !stale) {
        receipts.set(binding, { validation: validation, checkedAt: Date.now() });
        while (receipts.size > 2) receipts.delete(receipts.keys().next().value);
      }
      var aborted = cancelled(); if (activeRuns.get(binding) === run) activeRuns.delete(binding);
      var report = inspect(resource, options); return Object.assign({}, report, { cancelled: !!aborted, stale: stale });
    });
  }
  return { VERSION: VERSION, descriptor: descriptor, portable: portable, requirements: requirements, identity: identity, inspect: inspect, check: check };
});

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const getSpeechLangCode = (friendlyName) => {
  if (!friendlyName) return "en-US";
  const raw = String(friendlyName).trim();
  if (/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(raw)) {
    return raw.split("-").map((part, index) => {
      if (index === 0) return part.toLowerCase();
      if (/^[A-Za-z]{4}$/.test(part)) return part[0].toUpperCase() + part.slice(1).toLowerCase();
      if (/^(?:[A-Za-z]{2}|\d{3})$/.test(part)) return part.toUpperCase();
      return part.toLowerCase();
    }).join("-");
  }
  const normalize = (str) => str.toLowerCase().trim();
  const input = normalize(raw);
  const map = {
    "english": "en-US",
    "spanish": "es-ES",
    "spanish (latin america)": "es-419",
    "spanish (castilian)": "es-ES",
    "french": "fr-FR",
    "french (canadian)": "fr-CA",
    "german": "de-DE",
    "portuguese": "pt-BR",
    "portuguese (brazil)": "pt-BR",
    "portuguese (angola)": "pt-AO",
    "portuguese (portugal)": "pt-PT",
    "mandarin": "zh-CN",
    "chinese": "zh-CN",
    "chinese (mandarin)": "zh-CN",
    "chinese (simplified)": "zh-CN",
    "chinese (traditional)": "zh-TW",
    "arabic": "ar-SA",
    "vietnamese": "vi-VN",
    "russian": "ru-RU",
    "japanese": "ja-JP",
    "italian": "it-IT",
    "korean": "ko-KR",
    "hindi": "hi-IN",
    "dutch": "nl-NL",
    "polish": "pl-PL",
    "indonesian": "id-ID",
    "turkish": "tr-TR",
    "hebrew": "he-IL",
    "swedish": "sv-SE",
    "danish": "da-DK",
    "norwegian": "no-NO",
    "finnish": "fi-FI",
    "greek": "el-GR",
    "thai": "th-TH",
    "czech": "cs-CZ",
    "hungarian": "hu-HU",
    "romanian": "ro-RO",
    "ukrainian": "uk-UA",
    "cantonese": "zh-HK",
    "tagalog": "fil-PH",
    "filipino": "fil-PH",
    "bengali": "bn-IN",
    "urdu": "ur-PK",
    "malay": "ms-MY",
    "swahili": "sw-KE",
    "bulgarian": "bg-BG",
    "croatian": "hr-HR",
    "serbian": "sr-RS",
    "slovak": "sk-SK",
    "persian": "fa-IR",
    "farsi": "fa-IR",
    "tamil": "ta-IN",
    "amharic": "am-ET",
    "afrikaans": "af-ZA",
    "kurdish": "ku-TR",
    // 2026-07-12: languages that previously fell through to the 'en-US'
    // default — which silently ran ENGLISH speech recognition, TTS hints,
    // and (in Word Sounds) English G2P for these languages. Real codes let
    // every consumer make an honest per-language decision; unsupported
    // engines now fail visibly/fall back instead of pretending English.
    "somali": "so-SO",
    "haitian creole": "ht-HT",
    "haitian": "ht-HT",
    "khmer": "km-KH",
    "cambodian": "km-KH",
    "lao": "lo-LA",
    "burmese": "my-MM",
    "myanmar": "my-MM",
    "nepali": "ne-NP",
    "marathi": "mr-IN",
    "gujarati": "gu-IN",
    "punjabi": "pa-IN",
    "telugu": "te-IN",
    "kannada": "kn-IN",
    "malayalam": "ml-IN",
    "sinhala": "si-LK",
    "yoruba": "yo-NG",
    "igbo": "ig-NG",
    "hausa": "ha-NG",
    "kinyarwanda": "rw-RW",
    "kirundi": "rn-BI",
    "lingala": "ln-CD",
    "tigrinya": "ti-ET",
    "oromo": "om-ET",
    "mongolian": "mn-MN",
    "hmong": "hmn",
    "esperanto": "eo",
    "latin": "la",
    "pashto": "ps-AF",
    "pushto": "ps-AF",
    "dari": "prs-AF",
    "georgian": "ka-GE",
    "armenian": "hy-AM",
    "albanian": "sq-AL",
    "macedonian": "mk-MK",
    "acholi": "ach-UG",
    "karen": "kar-MM",
    "chin (hakha)": "cnh-MM",
    "chin (falam)": "cfm-MM",
    "maay maay": "ymm-SO",
    "marshallese": "mh-MH"
  };
  return map[input] || "en-US";
};
const languageToTTSCode = (friendlyName) => {
  const bcp47 = getSpeechLangCode(friendlyName);
  return bcp47.split("-")[0].toLowerCase();
};
const isRtlLang = (languageNameOrCode) => {
  if (!languageNameOrCode) return false;
  const s = String(languageNameOrCode).trim().toLowerCase();
  if (!s) return false;
  const code = s.split(/[-_]/)[0];
  const rtlCodes = /* @__PURE__ */ new Set(["ar", "arc", "he", "iw", "fa", "prs", "ur", "ps", "ku", "ckb", "sd", "ug", "yi", "dv", "syr", "nqo"]);
  if (rtlCodes.has(s) || rtlCodes.has(code)) return true;
  const rtlNames = /* @__PURE__ */ new Set([
    "arabic",
    "hebrew",
    "persian",
    "farsi",
    "dari",
    "urdu",
    "kurdish",
    "sorani",
    "pashto",
    "pushto",
    "yiddish",
    "sindhi",
    "uyghur",
    "uighur",
    "divehi",
    "dhivehi",
    "maldivian",
    "aramaic",
    "syriac"
  ]);
  return s.split(/[^a-z]+/).some((tok) => tok && rtlNames.has(tok));
};
const getContentDirection = (languageName) => {
  return isRtlLang(languageName) ? "rtl" : "ltr";
};
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    const t = this.context?.t || ((key) => {
      const f = { "errors.component_title": "Something went wrong", "errors.default_desc": "This component encountered an error. Please try again.", "errors.try_again": "Try Again", "common.refresh": "Refresh", "common.error_details": "Error Details" };
      return f[key] || key;
    });
    if (this.state.hasError) {
      return /* @__PURE__ */ React.createElement("div", { role: "alert", "aria-live": "assertive", "aria-atomic": "true", className: "w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-red-50 border-2 border-red-200 rounded-xl text-center animate-in fade-in zoom-in duration-300 motion-reduce:animate-none relative z-50" }, /* @__PURE__ */ React.createElement("div", { className: "bg-red-100 p-4 rounded-full text-red-700 mb-4 shadow-sm" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 48, "aria-hidden": "true" })), /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-black text-red-800 mb-2" }, this.props.title || t("errors.component_title")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-red-600 mb-6 max-w-md font-medium leading-relaxed" }, this.props.fallbackMessage || t("errors.default_desc")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            if (this.props.onRetry) this.props.onRetry();
            this.setState({ hasError: false, error: null });
          },
          className: "px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center gap-2 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
        },
        /* @__PURE__ */ React.createElement(RefreshCw, { size: 16, "aria-hidden": "true" }),
        " ",
        this.props.retryLabel || t("errors.try_again")
      )), Boolean(this.state.error) && /* @__PURE__ */ React.createElement("details", { className: "mt-8 text-[11px] text-red-600 text-left max-w-sm opacity-60 cursor-pointer" }, /* @__PURE__ */ React.createElement("summary", null, t("common.error_details")), /* @__PURE__ */ React.createElement("pre", { className: "mt-2 whitespace-pre-wrap" }, this.state.error.toString())));
    }
    return this.props.children;
  }
}
__publicField(ErrorBoundary, "contextType", LanguageContext);
const SESSION_RESOURCE_INLINE_LIMIT = 256 * 1024;
const SESSION_RESOURCE_CHUNK_SIZE = 180 * 1024;
const SESSION_ASSET_WRITE_CONCURRENCY = 3;
const stripUndefinedForFirestore = (obj) => {
  if (obj === null || obj === void 0) return obj;
  if (Array.isArray(obj)) return obj.map((v) => v === void 0 ? null : stripUndefinedForFirestore(v));
  if (typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== void 0).map(([k, v]) => [k, stripUndefinedForFirestore(v)])
    );
  }
  return obj;
};
const jsonByteLength = (value) => {
  const str = typeof value === "string" ? value : JSON.stringify(value);
  try {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(str).length;
  } catch (_) {
  }
  return str.length;
};
const hashStringForSessionAsset = (value) => {
  const str = typeof value === "string" ? value : JSON.stringify(value || "");
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};
const sanitizeSessionAssetIdPart = (value) => String(value || "x").replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80) || "x";
const makeSessionAssetId = (prefix, parts) => {
  if (Array.isArray(parts) && parts.length) {
    return [prefix].concat(parts.map(sanitizeSessionAssetIdPart)).join("_").slice(0, 420);
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};
const getSessionAssetRef = (appId, assetId) => doc(db, "artifacts", appId, "public", "data", "session_assets", assetId);
const getSessionAssetSecurityMetadata = (sessionCode) => {
  const ownerUid = window.__alloFirebase && window.__alloFirebase.auth && window.__alloFirebase.auth.currentUser && window.__alloFirebase.auth.currentUser.uid;
  const parentId = sanitizeSessionAssetIdPart(sessionCode);
  if (!ownerUid) throw new Error("Firebase Authentication must be ready before uploading session assets.");
  if (!sessionCode || parentId !== String(sessionCode)) throw new Error("A valid session or assignment ID is required for asset upload.");
  const parentKind = parentId.startsWith("HW-") ? "assignment" : "live";
  const now = /* @__PURE__ */ new Date();
  const lifetimeMs = parentKind === "assignment" ? 30 * 24 * 60 * 60 * 1e3 : 24 * 60 * 60 * 1e3;
  return {
    ownerUid,
    parentId,
    parentKind,
    createdAt: now,
    expiresAt: new Date(now.getTime() + lifetimeMs)
  };
};
const _sessionAssetUploadMemo = /* @__PURE__ */ new Set();
const enqueueChunkedStringAsset = (appId, assetId, kind, data, writeTasks, metadata = {}, options = {}) => {
  const memoWrites = !!options.contentAddressed;
  const pushSetDoc = (docId, payload) => {
    const memoKey = `${appId}|${docId}`;
    if (memoWrites && _sessionAssetUploadMemo.has(memoKey)) return;
    writeTasks.push(() => Promise.resolve(setDoc(getSessionAssetRef(appId, docId), payload)).then(() => {
      if (memoWrites) _sessionAssetUploadMemo.add(memoKey);
    }));
  };
  const text = typeof data === "string" ? data : JSON.stringify(data);
  if (jsonByteLength(text) > SESSION_RESOURCE_CHUNK_SIZE) {
    const chunkIds = [];
    for (let offset = 0; offset < text.length; offset += SESSION_RESOURCE_CHUNK_SIZE) {
      const chunkId = `${assetId}_chunk_${chunkIds.length}`;
      chunkIds.push(chunkId);
      pushSetDoc(chunkId, {
        kind: `${kind}Chunk`,
        parent: assetId,
        index: chunkIds.length - 1,
        data: text.slice(offset, offset + SESSION_RESOURCE_CHUNK_SIZE),
        ...metadata
      });
    }
    pushSetDoc(assetId, stripUndefinedForFirestore({
      kind: `${kind}Chunks`,
      chunks: chunkIds,
      byteLength: jsonByteLength(text),
      ...metadata
    }));
  } else {
    pushSetDoc(assetId, stripUndefinedForFirestore({
      kind,
      data: text,
      byteLength: jsonByteLength(text),
      ...metadata
    }));
  }
};
const enqueueSessionResourceAsset = (appId, assetId, item, itemJson, writeTasks, metadata = {}) => {
  if (jsonByteLength(itemJson) > SESSION_RESOURCE_CHUNK_SIZE) {
    enqueueChunkedStringAsset(appId, assetId, "sessionResource", itemJson, writeTasks, {
      id: item && item.id,
      type: item && item.type,
      title: item && item.title,
      meta: item && item.meta,
      ...metadata
    });
  } else {
    writeTasks.push(() => setDoc(getSessionAssetRef(appId, assetId), stripUndefinedForFirestore({
      kind: "sessionResource",
      resource: item,
      byteLength: jsonByteLength(itemJson),
      ...metadata
    })));
  }
};
const sanitizePortableAacImage = (value) => {
  if (typeof value !== "string") return null;
  if (/^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/]*={0,2}$/i.test(value)) return value;
  const match = value.match(/^data:image\/svg\+xml;base64,([A-Za-z0-9+/]*={0,2})$/i);
  if (!match || typeof atob !== "function") return null;
  try {
    const svg = atob(match[1]);
    if (!/<svg(?:\s|>)/i.test(svg)) return null;
    if (/<\s*(?:script|foreignObject|iframe|object|embed|link|style|image|audio|video)\b/i.test(svg) || /<!\s*(?:DOCTYPE|ENTITY)\b|<\?xml-stylesheet\b/i.test(svg) || /\son[a-z]+\s*=/i.test(svg) || /(?:href|xlink:href)\s*=\s*['"]\s*(?:https?:|\/\/|blob:|data:|javascript:)/i.test(svg) || /(?:url\s*\(|@import|javascript:|expression\s*\()/i.test(svg)) return null;
    return value;
  } catch (_) {
    return null;
  }
};
const sanitizePortableAacAudio = (audio, allowPrepared) => {
  if (!allowPrepared || !audio || typeof audio !== "object" || Array.isArray(audio) || audio.kind !== "prepared") return null;
  const data = typeof audio.data === "string" ? audio.data : "";
  const match = data.match(/^data:(audio\/(?:mpeg|mp3|mp4|aac|ogg|wav|webm|flac|x-wav));base64,[A-Za-z0-9+/]*={0,2}$/i);
  const mime = String(audio.mime || "").toLowerCase();
  if (!match || mime !== match[1].toLowerCase()) return null;
  const clean = { kind: "prepared", mime, data, __alloPortablePreparedAudio: true };
  if (audio.profile && typeof audio.profile === "object" && !Array.isArray(audio.profile)) {
    const profile = {};
    ["voice", "language", "provider", "engine", "model", "voiceResolverVersion"].forEach((key) => {
      const value = String(audio.profile[key] == null ? "" : audio.profile[key]).trim().slice(0, 80);
      if (value) profile[key] = value;
    });
    const rate = Number(audio.profile.synthesisRate);
    if (Number.isFinite(rate)) profile.synthesisRate = Math.max(0.25, Math.min(4, rate));
    if (Object.keys(profile).length) clean.profile = profile;
  }
  return clean;
};
const sanitizePortableAacResource = (item) => {
  if (!item || item.type !== "aac-board" || !item.data || typeof item.data !== "object") return item;
  const source = item.data;
  const privacy = source.metadata && source.metadata.privacy && typeof source.metadata.privacy === "object" ? source.metadata.privacy : {};
  let omittedImages = Math.max(0, Number(source.metadata && source.metadata.omittedNonportableImages) || 0);
  let omittedCustom = Math.max(0, Number(source.metadata && source.metadata.omittedCustomAudio) || 0);
  let omittedPrepared = Math.max(0, Number(source.metadata && source.metadata.omittedPreparedAudio) || 0);
  let preparedIncluded = false;
  const pages = (Array.isArray(source.pages) ? source.pages : []).slice(0, 12).map((page, pageIndex) => {
    const cells = (Array.isArray(page && page.cells) ? page.cells : []).slice(0, 64).map((cell, cellIndex) => {
      if (!cell || typeof cell !== "object") return null;
      const clean = {
        id: String(cell.id || "cell-" + (pageIndex + 1) + "-" + (cellIndex + 1)).slice(0, 96),
        index: Number.isFinite(Number(cell.index)) ? Math.max(0, Math.min(999, Math.round(Number(cell.index)))) : cellIndex,
        row: Number.isFinite(Number(cell.row)) ? Math.max(0, Math.min(99, Math.round(Number(cell.row)))) : 0,
        col: Number.isFinite(Number(cell.col)) ? Math.max(0, Math.min(99, Math.round(Number(cell.col)))) : 0,
        displayLabel: String(cell.displayLabel || "").slice(0, 160),
        vocalLabel: String(cell.vocalLabel || cell.displayLabel || "").slice(0, 240),
        originalLabel: String(cell.originalLabel || cell.displayLabel || "").slice(0, 160),
        description: String(cell.description || "").slice(0, 400),
        category: String(cell.category || "").slice(0, 80),
        image: sanitizePortableAacImage(cell.image)
      };
      if (cell.image && !clean.image) omittedImages += 1;
      if (cell.audio && cell.audio.kind === "custom") {
        omittedCustom += 1;
      } else if (cell.audio && cell.audio.kind === "prepared") {
        const audio = sanitizePortableAacAudio(cell.audio, privacy.preparedAudioIncluded === true);
        if (audio) {
          clean.audio = audio;
          preparedIncluded = true;
        } else {
          omittedPrepared += 1;
        }
      }
      return clean;
    }).filter(Boolean);
    return {
      id: String(page && page.id || "page-" + (pageIndex + 1)).slice(0, 96),
      title: String(page && page.title || "Page " + (pageIndex + 1)).slice(0, 160),
      cols: Number.isFinite(Number(page && page.cols)) ? Math.max(1, Math.min(12, Math.round(Number(page.cols)))) : 4,
      cells
    };
  });
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    data: {
      format: source.format,
      version: source.version,
      exportedAt: String(source.exportedAt || "").slice(0, 80),
      board: source.board && typeof source.board === "object" ? {
        id: String(source.board.id || "board").slice(0, 96),
        title: String(source.board.title || "AAC Board").slice(0, 160),
        locale: String(source.board.locale || "en-US").slice(0, 40),
        direction: source.board.direction === "rtl" ? "rtl" : "ltr"
      } : null,
      pages,
      metadata: {
        privacy: { customAudioIncluded: false, preparedAudioIncluded: preparedIncluded },
        omittedNonportableImages: omittedImages,
        omittedCustomAudio: omittedCustom,
        omittedPreparedAudio: omittedPrepared,
        warnings: Array.isArray(source.metadata && source.metadata.warnings) ? source.metadata.warnings.map((warning) => String(warning).slice(0, 240)).filter(Boolean).slice(0, 20) : []
      }
    }
  };
};
const stripUnsafeLiveSessionFields = (value, keyName = "", options = {}) => {
  if (value == null) return value;
  const allowPreparedAudio = options.allowPreparedAudio === true || value.__alloPortablePreparedAudio === true;
  if (typeof value === "string") {
    if (/^(audioRecording|rawAudio|voiceClip|recording|karaokeStudentAudio)$/i.test(keyName) || /^data:audio/i.test(value) && !allowPreparedAudio) return null;
    return value;
  }
  if (Array.isArray(value)) return value.map((entry) => stripUnsafeLiveSessionFields(entry, keyName, options));
  if (typeof value === "object" && !(value instanceof Date)) {
    const out = {};
    Object.keys(value).forEach((key) => {
      if (/^(audioRecording|rawAudio|voiceClip|recording|mimeType|karaokeStudentAudio)$/i.test(key) || key === "__alloPortablePreparedAudio") return;
      const childOptions = key === "audio" && value[key] && value[key].__alloPortablePreparedAudio ? { ...options, allowPreparedAudio: true } : options;
      out[key] = stripUnsafeLiveSessionFields(value[key], key, childOptions);
    });
    return out;
  }
  return value;
};
const compactLargeSessionResources = (appId, resources, writeTasks, options = {}) => {
  let resourcesJson = "";
  try {
    resourcesJson = JSON.stringify(resources);
  } catch (_) {
    return resources;
  }
  const shouldExternalize = options.alwaysExternalize || jsonByteLength(resourcesJson) > SESSION_RESOURCE_INLINE_LIMIT;
  if (!shouldExternalize) {
    return resources;
  }
  console.log("[SESSION DEBUG] Storing live-session resource bodies as refs outside the session doc.");
  const sessionCode = options.sessionCode || "session";
  const securityMetadata = options.securityMetadata || {};
  const manifest = resources.map((item, index) => {
    let itemJson = "";
    try {
      itemJson = JSON.stringify(item);
    } catch (_) {
      itemJson = JSON.stringify({
        id: item && item.id,
        type: item && item.type,
        title: item && item.title,
        data: item && item.data
      });
    }
    const itemHash = hashStringForSessionAsset(itemJson);
    const assetId = makeSessionAssetId("res", [sessionCode, index, item && item.id || item && item.type || "resource"]);
    enqueueSessionResourceAsset(appId, assetId, item, itemJson, writeTasks, securityMetadata);
    return stripUndefinedForFirestore({
      // Manifest fields are identifiers only. In particular, never copy
      // resource meta here: some generators attach previews or audio maps
      // there, which would put binary payload back into the session document.
      id: String(item && item.id || assetId).slice(0, 240),
      type: String(item && item.type || "resource").slice(0, 80),
      title: String(item && item.title || "").slice(0, 180),
      __alloResourceRef: assetId,
      __alloResourceBytes: jsonByteLength(itemJson),
      __alloResourceHash: itemHash,
      __alloResourceIndex: index
    });
  });
  let manifestJson = "";
  try {
    manifestJson = JSON.stringify(manifest);
  } catch (_) {
    return manifest;
  }
  if (jsonByteLength(manifestJson) <= SESSION_RESOURCE_INLINE_LIMIT) {
    return manifest;
  }
  const manifestHash = hashStringForSessionAsset(manifestJson);
  const manifestId = makeSessionAssetId("manifest", [sessionCode, manifestHash]);
  enqueueChunkedStringAsset(appId, manifestId, "sessionResourcesManifest", manifestJson, writeTasks, {
    count: manifest.length,
    hash: manifestHash,
    ...securityMetadata
  });
  return [stripUndefinedForFirestore({
    id: manifestId,
    type: "session-resources-manifest",
    title: "Live session resources",
    __alloResourcesManifestRef: manifestId,
    __alloResourceCount: manifest.length,
    __alloResourcesManifestHash: manifestHash,
    __alloResourceBytes: jsonByteLength(manifestJson)
  })];
};
const runFirestoreWriteTasks = async (writeTasks, concurrency = SESSION_ASSET_WRITE_CONCURRENCY) => {
  if (!Array.isArray(writeTasks) || writeTasks.length === 0) return;
  const workerCount = Math.max(1, Math.min(concurrency, writeTasks.length));
  let nextIndex = 0;
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < writeTasks.length) {
      const task = writeTasks[nextIndex++];
      await task();
    }
  });
  await Promise.all(workers);
};
const uploadSessionAssets = async (appId, resources, sessionCode) => {
  console.log("[SESSION DEBUG] uploadSessionAssets called, resources:", resources?.length);
  if (!resources || !Array.isArray(resources)) return;
  try {
    resources.forEach((r, i) => {
      try {
        structuredClone(r);
      } catch (cloneErr) {
        console.error(`[SESSION DEBUG] Resource ${i} (${r?.type}/${r?.title}) CANNOT be cloned:`, cloneErr?.message);
        if (r && typeof r === "object") {
          Object.keys(r).forEach((key) => {
            try {
              structuredClone(r[key]);
            } catch (keyErr) {
              console.error(`[SESSION DEBUG]   Key "${key}" is NOT cloneable:`, keyErr?.message, typeof r[key]);
              if (key === "data" && r[key] && typeof r[key] === "object") {
                Object.keys(r[key]).forEach((subKey) => {
                  try {
                    structuredClone(r[key][subKey]);
                  } catch (subErr) {
                    console.error(`[SESSION DEBUG]     data.${subKey} is NOT cloneable:`, subErr?.message, typeof r[key][subKey]);
                  }
                });
              }
            }
          });
        }
      }
    });
  } catch (preCheckErr) {
    console.error("[SESSION DEBUG] Pre-check error:", preCheckErr);
  }
  const securityMetadata = getSessionAssetSecurityMetadata(sessionCode);
  const portableResources = resources.map((item) => {
    if (!item || item.type !== "word-sounds") return sanitizePortableAacResource(item);
    const readiness = window.AlloModules && window.AlloModules.WordSoundsReadiness;
    if (!readiness || typeof readiness.portable !== "function") throw new Error("Word Sounds audio preparation is unavailable. Reload and retry.");
    return readiness.portable(item);
  });
  const safeResources = structuredClone(stripUnsafeLiveSessionFields(portableResources));
  portableResources.forEach((item, index) => {
    if (!item || item.type !== "word-sounds") return;
    ["wsPreloadedWords", "data"].forEach((layout) => {
      if (!Array.isArray(item[layout]) || !Array.isArray(safeResources[index]?.[layout])) return;
      item[layout].forEach((word, wordIndex) => {
        const assets = word?._ttsAssets;
        const target = safeResources[index][layout][wordIndex];
        if (!assets || !target || typeof target !== "object") return;
        ["__proto__", "constructor", "prototype"].forEach((key) => {
          if (!Object.prototype.hasOwnProperty.call(assets, key)) return;
          if (!target._ttsAssets || typeof target._ttsAssets !== "object" || Array.isArray(target._ttsAssets)) target._ttsAssets = /* @__PURE__ */ Object.create(null);
          Object.defineProperty(target._ttsAssets, key, { value: { mime: assets[key].mime, base64: assets[key].base64 }, enumerable: true, configurable: true, writable: true });
        });
      });
    });
  });
  const writeTasks = [];
  const processField = (obj, key, assetSeed) => {
    const val = obj[key];
    if (val && typeof val === "string" && val.startsWith("data:image")) {
      const assetId = makeSessionAssetId("img", assetSeed.concat([key, hashStringForSessionAsset(val)]));
      obj[key] = `ref::${assetId}`;
      enqueueChunkedStringAsset(appId, assetId, "sessionImage", val, writeTasks, securityMetadata, { contentAddressed: true });
    }
  };
  const processJsonField = (obj, key, prefix, sessionSeed) => {
    const val = obj && obj[key];
    if (!val || typeof val !== "object" || Array.isArray(val)) return;
    let json = "";
    try {
      json = JSON.stringify(val);
    } catch (_) {
      return;
    }
    if (jsonByteLength(json) <= 2048) return;
    const assetId = makeSessionAssetId(prefix, [sessionSeed, hashStringForSessionAsset(json)]);
    obj[key] = `jsonref::${assetId}`;
    enqueueChunkedStringAsset(appId, assetId, "sessionJson", json, writeTasks, securityMetadata, { contentAddressed: true });
  };
  safeResources.forEach((item, index) => {
    const seed = [sessionCode || "session", index, item && item.id || item && item.type || "resource"];
    if (item.type === "image" && item.data) {
      processField(item.data, "imageUrl", seed);
    }
    if (item.type === "glossary" && Array.isArray(item.data)) {
      item.data.forEach((term, termIndex) => {
        processField(term, "image", seed.concat(["term", termIndex]));
      });
    }
    if (item.type === "memory-aid" && item.data && Array.isArray(item.data.cards)) {
      item.data.cards.forEach((card, cardIndex) => {
        if (card && typeof card === "object") processField(card, "visualImage", seed.concat(["card", cardIndex]));
      });
    }
    if (item.type === "adventure" && item.data) {
      processField(item.data, "sceneImage", seed);
      if (Array.isArray(item.data.inventory)) {
        item.data.inventory.forEach((inv, invIndex) => processField(inv, "image", seed.concat(["inventory", invIndex])));
      }
    }
    if (item.type === "persona" && Array.isArray(item.data)) {
      item.data.forEach((p, personaIndex) => processField(p, "avatarUrl", seed.concat(["persona", personaIndex])));
    }
    if (item.type === "word-sounds" && Array.isArray(item.data)) {
      item.data.forEach((wordItem, wordIndex) => {
        if (!wordItem || typeof wordItem !== "object") return;
        processField(wordItem, "image", seed.concat(["word", wordIndex]));
        processJsonField(wordItem, "_ttsAssets", "wsaudio", sessionCode || "session");
        processJsonField(wordItem, "_decodingAssets", "wsimg", sessionCode || "session");
        processJsonField(wordItem, "_aacAssets", "wsaac", sessionCode || "session");
      });
    }
  });
  const firestoreResources = stripUndefinedForFirestore(safeResources);
  const resourcesForSessionDoc = compactLargeSessionResources(appId, firestoreResources, writeTasks, { alwaysExternalize: true, sessionCode, securityMetadata });
  await runFirestoreWriteTasks(writeTasks);
  return resourcesForSessionDoc;
};
const SESSION_ASSET_READ_ATTEMPTS = 3;
const SESSION_ASSET_RETRY_BASE_MS = 120;
const waitForSessionAssetRetry = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const createSessionAssetHydrationError = (assetId, reason, cause) => {
  const error = new Error("Live session resource is temporarily unavailable.");
  error.name = "SessionAssetHydrationError";
  error.code = "session-asset-unavailable";
  error.assetId = String(assetId || "").slice(0, 160);
  error.reason = String(reason || "unavailable").slice(0, 80);
  if (cause) error.cause = cause;
  return error;
};
const getSessionAssetSnapshotWithRetry = async (appId, assetId, options = {}) => {
  const attempts = Math.max(1, Math.min(5, Math.round(Number(options.attempts) || SESSION_ASSET_READ_ATTEMPTS)));
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const snap = await getDoc(getSessionAssetRef(appId, assetId));
      if (snap && snap.exists()) return snap;
      lastError = createSessionAssetHydrationError(assetId, "missing");
    } catch (error) {
      lastError = createSessionAssetHydrationError(assetId, "read-failed", error);
    }
    if (attempt < attempts) await waitForSessionAssetRetry(SESSION_ASSET_RETRY_BASE_MS * attempt);
  }
  throw lastError || createSessionAssetHydrationError(assetId, "unavailable");
};
const loadChunkedAssetString = async (appId, payload) => {
  if (!payload || !Array.isArray(payload.chunks) || payload.chunks.length === 0) {
    throw createSessionAssetHydrationError("", "invalid-chunk-manifest");
  }
  const chunkSnaps = await Promise.all(payload.chunks.map((chunkId) => getSessionAssetSnapshotWithRetry(appId, chunkId)));
  return chunkSnaps.map((chunkSnap, index) => {
    const data = (chunkSnap.data() || {}).data;
    if (typeof data !== "string") throw createSessionAssetHydrationError(payload.chunks[index], "invalid-chunk");
    return data;
  }).join("");
};
const hydrateResourcesManifest = async (appId, resources) => {
  const source = Array.isArray(resources) ? resources : [];
  const expanded = [];
  for (const item of source) {
    if (!item || typeof item !== "object" || !item.__alloResourcesManifestRef) {
      expanded.push(item);
      continue;
    }
    const manifestId = item.__alloResourcesManifestRef;
    const manifestSnap = await getSessionAssetSnapshotWithRetry(appId, manifestId);
    const payload = manifestSnap.data() || {};
    let manifestJson = "";
    if (payload.kind === "sessionResourcesManifest" && typeof payload.data === "string") {
      manifestJson = payload.data;
    } else if (payload.kind === "sessionResourcesManifestChunks" && Array.isArray(payload.chunks)) {
      manifestJson = await loadChunkedAssetString(appId, payload);
    }
    if (!manifestJson) throw createSessionAssetHydrationError(manifestId, "invalid-manifest");
    let manifestItems;
    try {
      manifestItems = JSON.parse(manifestJson);
    } catch (error) {
      throw createSessionAssetHydrationError(manifestId, "invalid-manifest-json", error);
    }
    if (!Array.isArray(manifestItems)) throw createSessionAssetHydrationError(manifestId, "invalid-manifest-shape");
    expanded.push(...manifestItems);
  }
  return expanded;
};
const hydrateSessionAssets = async (appId, resources) => {
  const manifestResources = await hydrateResourcesManifest(appId, resources);
  const hydrated = structuredClone(manifestResources);
  await Promise.all(hydrated.map(async (item, index) => {
    if (!item || typeof item !== "object" || !item.__alloResourceRef) return;
    const resourceId = item.__alloResourceRef;
    const snap = await getSessionAssetSnapshotWithRetry(appId, resourceId);
    const payload = snap.data() || {};
    if (payload.kind === "sessionResource" && payload.resource) {
      hydrated[index] = payload.resource;
      return;
    }
    if (payload.kind === "sessionResourceChunks" && Array.isArray(payload.chunks)) {
      const json = await loadChunkedAssetString(appId, payload);
      try {
        hydrated[index] = JSON.parse(json);
      } catch (error) {
        throw createSessionAssetHydrationError(resourceId, "invalid-resource-json", error);
      }
      return;
    }
    throw createSessionAssetHydrationError(resourceId, "invalid-resource");
  }));
  const fetchPromises = [];
  const restoreField = (obj, key) => {
    const val = obj[key];
    if (val && typeof val === "string" && val.startsWith("ref::")) {
      const assetId = val.slice("ref::".length);
      fetchPromises.push((async () => {
        const snap = await getSessionAssetSnapshotWithRetry(appId, assetId);
        const payload = snap.data() || {};
        const restored = payload.kind === "sessionImageChunks" && Array.isArray(payload.chunks) ? await loadChunkedAssetString(appId, payload) : payload.data;
        if (typeof restored !== "string") throw createSessionAssetHydrationError(assetId, "invalid-image");
        obj[key] = restored;
      })());
    }
  };
  const restoreJsonField = (obj, key) => {
    const val = obj && obj[key];
    if (val && typeof val === "string" && val.startsWith("jsonref::")) {
      const assetId = val.slice("jsonref::".length);
      fetchPromises.push((async () => {
        const snap = await getSessionAssetSnapshotWithRetry(appId, assetId);
        const payload = snap.data() || {};
        const json = Array.isArray(payload.chunks) ? await loadChunkedAssetString(appId, payload) : payload.data;
        try {
          obj[key] = JSON.parse(json || "null");
        } catch (error) {
          throw createSessionAssetHydrationError(assetId, "invalid-json-asset", error);
        }
      })());
    }
  };
  hydrated.forEach((item) => {
    if (item.type === "image" && item.data) restoreField(item.data, "imageUrl");
    if (item.type === "glossary" && Array.isArray(item.data)) item.data.forEach((term) => restoreField(term, "image"));
    if (item.type === "adventure" && item.data) {
      restoreField(item.data, "sceneImage");
      if (Array.isArray(item.data.inventory)) item.data.inventory.forEach((inv) => restoreField(inv, "image"));
    }
    if (item.type === "persona" && Array.isArray(item.data)) item.data.forEach((persona) => restoreField(persona, "avatarUrl"));
    if (item.type === "word-sounds" && Array.isArray(item.data)) {
      item.data.forEach((wordItem) => {
        if (!wordItem || typeof wordItem !== "object") return;
        restoreField(wordItem, "image");
        restoreJsonField(wordItem, "_ttsAssets");
        restoreJsonField(wordItem, "_decodingAssets");
        restoreJsonField(wordItem, "_aacAssets");
      });
    }
  });
  await Promise.all(fetchPromises);
  return hydrated;
};
window.AlloModules = window.AlloModules || {};
window.AlloModules.ModuleScopeExtras = {
  getSpeechLangCode: getSpeechLangCode,
  languageToTTSCode: languageToTTSCode,
  isRtlLang: isRtlLang,
  getContentDirection: getContentDirection,
  ErrorBoundary: ErrorBoundary,
  uploadSessionAssets: uploadSessionAssets,
  hydrateSessionAssets: hydrateSessionAssets,
};
// Window mirrors so existing host references resolve without a shim hop.
window.getSpeechLangCode = getSpeechLangCode;
window.languageToTTSCode = languageToTTSCode;
window.isRtlLang = isRtlLang;
window.getContentDirection = getContentDirection;
window.ErrorBoundary = ErrorBoundary;
window.uploadSessionAssets = uploadSessionAssets;
window.hydrateSessionAssets = hydrateSessionAssets;
if (typeof window._upgradeModuleScopeExtras === 'function') {
  try { window._upgradeModuleScopeExtras(); } catch (e) { console.warn('[ModuleScopeExtras] upgrade hook failed', e); }
}
console.log('[CDN] ModuleScopeExtrasModule loaded — 4 lang utils + ErrorBoundary + 2 session-asset helpers');
})();
