/* Shared, data-only word practice contract. No AI, storage, or network calls. */
(function (root) {
  'use strict';
  function createWordPracticeCore() {
    const LIMITS = Object.freeze({ words: 200, wordLength: 120, audioChars: 4 * 1024 * 1024, totalAudioChars: 24 * 1024 * 1024 });
    const own = (obj, key) => obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    const text = (value, max = 2000) => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '';
    const key = value => text(value).normalize('NFC').toLocaleLowerCase().replace(/\s+/g, ' ');
    const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
    const safeJson = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    function safeAudio(value) {
      let candidate = typeof value === 'string' ? value : value && typeof value.mime === 'string' && typeof value.base64 === 'string'
        ? 'data:' + value.mime + ';base64,' + value.base64 : '';
      if (candidate.length > LIMITS.audioChars) return '';
      const match = /^data:(audio\/(?:mpeg|mp3|wav|x-wav|wave|ogg|webm|mp4|x-m4a|aac|flac));base64,([a-z0-9+/]*={0,2})$/i.exec(candidate);
      if (!match || match[2].length < 12 || match[2].length % 4 !== 0) return '';
      try {
        const bytes = atob(match[2].slice(0, 80));
        const at = i => bytes.charCodeAt(i);
        const mime = match[1].toLowerCase();
        const valid = /wav|wave/.test(mime) ? bytes.slice(0, 4) === 'RIFF' && bytes.slice(8, 12) === 'WAVE'
          : /mpeg|mp3/.test(mime) ? bytes.startsWith('ID3') || (at(0) === 255 && (at(1) & 224) === 224)
          : mime === 'audio/aac' ? at(0) === 255 && (at(1) & 246) === 240
          : mime === 'audio/ogg' ? bytes.startsWith('OggS')
          : mime === 'audio/webm' ? at(0) === 26 && at(1) === 69 && at(2) === 223 && at(3) === 163
          : mime === 'audio/flac' ? bytes.startsWith('fLaC') : bytes.slice(4, 8) === 'ftyp';
        return valid ? 'data:' + mime + ';base64,' + match[2] : '';
      } catch (_) { return ''; }
    }
    function parseWords(value) {
      const input = typeof value === 'string' ? value : '';
      if (input.length > 100000) throw new Error('Use up to 200 words in one practice set.');
      return input.split(/[,\r\n]+/).map(word => word.trim()).filter(Boolean);
    }
    const bounded = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
    function normalizeOptions(value = {}) {
      const options = value && typeof value === 'object' ? value : {};
      return {
        mode: ['popup', 'blend', 'vocabulary', 'spelling', 'sentence'].includes(options.mode) ? options.mode : 'popup',
        repetitions: Math.round(bounded(options.repetitions == null ? 3 : options.repetitions, 3, 1, 10)),
        shuffle: options.shuffle !== false,
        varyPosition: options.varyPosition === true,
        varySize: options.varySize === true,
        autoAdvance: options.autoAdvance === true,
        intervalSeconds: bounded(options.intervalSeconds == null ? 3 : options.intervalSeconds, 3, 1, 30),
        includeAudio: options.includeAudio !== false
      };
    }
    function translationsFor(value) {
      if (typeof value === 'string') return value ? [{ language: '', text: text(value, 1000) }] : [];
      if (Array.isArray(value)) return value.slice(0, 20).map(item => typeof item === 'string'
        ? { language: '', text: text(item, 1000) }
        : { language: text(item && (item.language || item.lang), 60), text: text(item && (item.text || item.term || item.translation || item.word), 1000) }).filter(item => item.text);
      if (!value || typeof value !== 'object') return [];
      return Object.keys(value).slice(0, 20).filter(language => !['__proto__', 'constructor', 'prototype'].includes(language)).map(language => ({
        language: text(language, 60), text: text(typeof value[language] === 'string' ? value[language] : value[language] && (value[language].term || value[language].translation || value[language].word || value[language].text), 1000)
      })).filter(item => item.text);
    }
    function sentenceActivityFor(record, word) {
      const saved = record.sentenceActivity;
      const board = record.activityItems && record.activityItems.read_sentence;
      const source = saved || board;
      if (!source || typeof source !== 'object') return null;
      if (saved && key(saved.answer) !== key(word)) return null;
      const choices = [...new Set((Array.isArray(source.choices || source.options) ? source.choices || source.options : []).map(value => text(value, 120)).filter(Boolean))];
      const answer = choices.find(value => key(value) === key(saved ? saved.answer : word));
      if (choices.length < 2 || choices.length > 6 || !answer) return null;
      let prompt;
      if (saved) prompt = text(saved.prompt);
      else {
        if (typeof board.before !== 'string' || typeof board.after !== 'string' || typeof board.sentence !== 'string') return null;
        // Preserve the teacher's prepared blank and choices. Do not invent a
        // sentence, or export a stale board whose target word has changed.
        const before = board.before.trim(), after = board.after.trim();
        const join = target => (before + ' ' + target + (/^[.,!?]/.test(after) ? '' : ' ') + after).trim();
        if (key(join(word)) !== key(board.sentence)) return null;
        prompt = text(join('____'));
      }
      return prompt ? { prompt, choices, answer } : null;
    }
    function normalizeInput(input = {}) {
      if (Array.isArray(input)) input = { words: input };
      if (!input || typeof input !== 'object') throw new Error('Open a saved word practice set or paste a word list.');
      const supplied = input.words == null ? (input.items == null ? input.data : input.items) : input.words;
      const words = typeof supplied === 'string' ? parseWords(supplied) : Array.isArray(supplied) ? supplied : [];
      if (words.length > 2000) throw new Error('Use up to 200 different words in one practice set.');
      const assets = Object.create(null);
      function addAssets(source) {
        if (!source || typeof source !== 'object') return;
        Object.keys(source).forEach(name => { if (!['__proto__', 'constructor', 'prototype'].includes(name)) assets[key(name)] = source[name]; });
      }
      addAssets(input.ttsAssets);
      words.forEach(item => { if (item && typeof item === 'object') addAssets(item._ttsAssets); });
      const bank = input.phonemeBank && typeof input.phonemeBank === 'object' ? input.phonemeBank : {};
      const items = [], seen = new Map();
      words.forEach(raw => {
        const record = typeof raw === 'string' ? { word: raw } : raw && typeof raw === 'object' ? raw : {};
        const original = text(record.targetWord || record.word || record.term, 10000).normalize('NFC');
        if (!original) return;
        if (original.length > LIMITS.wordLength) throw new Error('Each word or short phrase must be 120 characters or fewer.');
        const itemKey = key(original);
        const phonemes = (Array.isArray(record.phonemes) ? record.phonemes : []).slice(0, 40).map(phoneme => {
          const label = text(typeof phoneme === 'string' ? phoneme : phoneme && (phoneme.label || phoneme.grapheme || phoneme.ipa || phoneme.text || phoneme.phoneme), 40);
          const soundKey = text(phoneme && typeof phoneme === 'object' && (phoneme.soundKey || phoneme.ipa || phoneme.phoneme), 40) || label;
          const bankKey = soundKey.replace(/^\/+|\/+$/g, '').trim().toLowerCase();
          return { label, soundKey, audio: safeAudio(phoneme && typeof phoneme === 'object' && (phoneme.audio || phoneme.asset)) || safeAudio(own(bank, bankKey)) };
        }).filter(phoneme => phoneme.label);
        const item = {
          id: 'w' + (items.length + 1), word: original,
          definition: text(record.definition || record.def || record.meaning),
          example: text(record.example || record.exampleSentence || record.sentence),
          translations: translationsFor(record.translations || record.translation),
          wordAudio: safeAudio(record.wordAudio || record.audio || record.audioUrl || record.pronunciationAudio) || safeAudio(assets[itemKey]),
          phonemes,
          sentenceActivity: sentenceActivityFor(record, original)
        };
        if (seen.has(itemKey)) {
          const existing = seen.get(itemKey);
          ['definition', 'example', 'wordAudio'].forEach(field => { if (!existing[field]) existing[field] = item[field]; });
          if (!existing.phonemes.length) existing.phonemes = item.phonemes;
          if (!existing.translations.length) existing.translations = item.translations;
          if (!existing.sentenceActivity) existing.sentenceActivity = item.sentenceActivity;
          return;
        }
        seen.set(itemKey, item); items.push(item);
      });
      if (items.length > LIMITS.words) throw new Error('Use up to 200 different words in one practice set.');
      // Count references, not just unique strings: standalone JSON embeds each
      // referenced clip, even when many words share a phoneme recording.
      let audioChars = 0;
      items.forEach(item => { audioChars += item.wordAudio.length; item.phonemes.forEach(sound => { audioChars += sound.audio.length; }); });
      if (audioChars > LIMITS.totalAudioChars) throw new Error('This practice set has too much audio. Split it into smaller word lists.');
      return { version: 1, title: text(input.title, 160) || 'Word Fluency Pop-Up', language: text(input.language, 80) || 'en', items, options: normalizeOptions(input.options) };
    }
    function createSequence(pack, value = {}, rng = Math.random) {
      const options = normalizeOptions(value);
      const allItems = Array.isArray(pack && pack.items) ? pack.items : [];
      const items = options.mode === 'sentence' ? allItems.filter(item => item.sentenceActivity) : allItems;
      if (options.mode === 'sentence' && !items.length) throw new Error('Prepare a Finish the Sentence activity in Word Sounds, then open Present & Export from that prepared set.');
      if (items.length > LIMITS.words) throw new Error('Use up to 200 words in one practice set.');
      const randomIndex = length => Math.min(length - 1, Math.max(0, Math.floor((Number(rng()) || 0) * length)));
      const positions = ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
      const scales = [0.8, 1, 1.15];
      const sequence = [];
      for (let round = 0; round < options.repetitions; round++) {
        const order = items.map(item => item.id);
        if (options.shuffle) for (let i = order.length - 1; i > 0; i--) { const j = randomIndex(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
        if (order.length > 1 && sequence.length && sequence[sequence.length - 1].itemId === order[0]) {
          const j = 1 + randomIndex(order.length - 1); [order[0], order[j]] = [order[j], order[0]];
        }
        order.forEach(itemId => sequence.push({ itemId, position: options.varyPosition ? positions[randomIndex(positions.length)] : 'center', scale: options.varySize ? scales[randomIndex(scales.length)] : 1 }));
      }
      return sequence;
    }
    function audioCoverage(pack) {
      const result = { words: 0, totalWords: 0, phonemes: 0, totalPhonemes: 0, completePhonemeWords: 0 };
      (pack && pack.items || []).forEach(item => {
        result.totalWords++; if (safeAudio(item.wordAudio)) result.words++;
        const sounds = item.phonemes || []; result.totalPhonemes += sounds.length;
        const ready = sounds.filter(sound => safeAudio(sound.audio)).length;
        result.phonemes += ready;
        if (ready && ready === sounds.length) result.completePhonemeWords++;
      });
      return result;
    }
    function serializePack(pack) { return safeJson(normalizeInput(pack)); }
    return { LIMITS, text, key, safeAudio, escapeHtml, safeJson, parseWords, normalizeInput, normalizeOptions, createSequence, audioCoverage, serializePack };
  }
  root.AlloWordPracticeCore = createWordPracticeCore();
  // The standalone HTML player embeds this exact factory, keeping its validator
  // and sequence behavior identical to the in-app experience.
  root.AlloWordPracticeCore.createCore = createWordPracticeCore;
})(typeof window !== 'undefined' ? window : globalThis);
