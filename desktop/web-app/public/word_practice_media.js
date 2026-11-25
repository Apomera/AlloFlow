/* Portable audio and editable PowerPoint export for shared word practice. */
(function (root) {
  'use strict';
  const getCore = () => root.AlloWordPracticeCore;
  function checkAbort(context) {
    if (context && context.signal && context.signal.aborted) {
      const error = new Error('Word practice preparation was cancelled.'); error.name = 'AbortError'; throw error;
    }
  }
  function bytesToBase64(bytes) {
    let value = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) value += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    return btoa(value);
  }
  function dataBytes(source) {
    const value = atob(source.slice(source.indexOf(',') + 1));
    return Uint8Array.from(value, character => character.charCodeAt(0));
  }
  function boundedWait(promise, milliseconds, message, signal) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(reject, new Error(message)), milliseconds);
      const abort = () => { const error = new Error('Preparation cancelled.'); error.name = 'AbortError'; finish(reject, error); };
      const finish = (callback, value) => { clearTimeout(timer); if (signal) signal.removeEventListener('abort', abort); callback(value); };
      if (signal) { if (signal.aborted) { abort(); return; } signal.addEventListener('abort', abort, { once: true }); }
      Promise.resolve(promise).then(value => finish(resolve, value), error => finish(reject, error));
    });
  }
  function isAllowedPortableAudioUrl(source) {
    if (typeof source !== 'string') return false;
    const trimmed = source.trim();
    if (!trimmed) return false;
    if (/^blob:/i.test(trimmed)) return true;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:') return true;
      if (parsed.protocol === 'http:') {
        const host = parsed.hostname.toLowerCase();
        return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
      }
      return false;
    } catch (_) {
      return false;
    }
  }
  async function portableAudio(source, context) {
    const core = getCore(), direct = core.safeAudio(source);
    if (direct) return direct;
    if (!isAllowedPortableAudioUrl(source)) return '';
    checkAbort(context);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (context.signal) context.signal.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, 15000);
    try {
      const response = await (context.fetch || root.fetch)(source, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' });
      if (!response || !response.ok) throw new Error('The audio clip could not be downloaded.');
      const maxBytes = Math.floor(core.LIMITS.audioChars * 0.74);
      const lenHeader = response.headers && typeof response.headers.get === 'function' ? response.headers.get('content-length') : null;
      if (lenHeader != null && Number(lenHeader) > maxBytes) throw new Error('The audio clip is too large.');
      const blob = await response.blob();
      if (blob.size > maxBytes) throw new Error('The audio clip is too large.');
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const mime = (blob.type || 'audio/mpeg').split(';')[0].trim();
      return core.safeAudio('data:' + mime + ';base64,' + bytesToBase64(bytes));
    } finally {
      clearTimeout(timer);
      if (context.signal) context.signal.removeEventListener('abort', cancel);
    }
  }
  // Retain the portable exporter's older breve spellings as a fallback. All
  // shared phonics/IPA aliases are resolved once by the core, before lookup.
  const legacySoundAliases = Object.assign(Object.create(null), { '\u0103': 'a', '\u0115': 'e', '\u012d': 'i', '\u014f': 'o', '\u016d': 'u' });
  function wordBankSources(bank, wordKey) {
    if (!bank || typeof bank !== 'object' || Array.isArray(bank)) return [];
    const core = getCore(), own = name => Object.prototype.hasOwnProperty.call(bank, name);
    const names = [wordKey, ...Object.keys(bank).filter(name => name !== wordKey && core.key(name) === wordKey)];
    return names.filter(own).map(name => bank[name]);
  }
  const defaultEnglish = language => getCore().audioLanguageKey(language) === getCore().audioLanguageKey('English');
  function scopedBanks(context, name, language, fallbackLanguage) {
    const core = getCore(), result = [], expected = core.audioLanguageKey(language);
    const grouped = context[name + 's'];
    if (grouped && typeof grouped === 'object' && !Array.isArray(grouped)) {
      Object.keys(grouped).forEach(scope => {
        if (core.audioLanguageKey(scope) === expected) result.push({ bank: grouped[scope], language: scope });
      });
    }
    const scope = context.bankLanguage || context.language || fallbackLanguage;
    if (context[name] && core.audioLanguageKey(scope) === expected) result.push({ bank: context[name], language: scope });
    return result;
  }
  function audioLabel(context, name, fallback, params = {}) {
    const key = 'word_practice.' + name;
    let value = context.labels && context.labels[name];
    if (typeof value !== 'string' || !value || value === key) {
      try { value = typeof context.t === 'function' ? context.t(key) : ''; } catch (_) { value = ''; }
    }
    let result = typeof value === 'string' && value && value !== key ? value : fallback;
    Object.keys(params).forEach(name => { result = result.split('{' + name + '}').join(String(params[name])); });
    return result;
  }
  const staleAudioMessage = (context, word) => audioLabel(context, 'audio_language_stale', 'A saved recording for “{word}” was left out because its language no longer matches. Prepare audio to replace it.', { word });
  async function portableClip(source, context, language, fallbackProvenance) {
    const core = getCore();
    const supplied = core.audioCompatibility(source, language).provenance;
    const provenance = { ...fallbackProvenance, ...supplied };
    const raw = source && typeof source === 'object' ? (source.audio || source.asset || source) : source;
    const audio = await portableAudio(raw, context);
    return core.audioCompatibility(audio, language, provenance);
  }
  async function warmPhonemeBank(pack, context) {
    const core = getCore();
    if (typeof root.getAudio !== 'function' || typeof root.addEventListener !== 'function' || !pack.items.some(item => defaultEnglish(core.fieldLanguage(item, 'term', pack.language)) && item.phonemes.some(sound => !sound.audio))) return;
    // The host's getAudio is synchronous: a miss starts a lazy category load
    // and returns null. Wait once for that category so the first export works.
    await new Promise((resolve, reject) => {
      let timer;
      const finish = error => {
        clearTimeout(timer); root.removeEventListener('audio_bank_loaded', loaded);
        if (context.signal) context.signal.removeEventListener('abort', cancelled);
        error ? reject(error) : resolve();
      };
      const loaded = () => { try { if (root.getAudio('phonemes', 'a')) finish(); } catch (error) { finish(error); } };
      const cancelled = () => { const error = new Error('Preparation cancelled.'); error.name = 'AbortError'; finish(error); };
      root.addEventListener('audio_bank_loaded', loaded);
      if (context.signal) context.signal.addEventListener('abort', cancelled, { once: true });
      timer = setTimeout(() => finish(), 6000);
      if (context.signal && context.signal.aborted) cancelled(); else loaded();
    });
  }
  async function recordedSound(sound, context, language, packLanguage, mismatch) {
    const core = getCore();
    const key = core.soundKey(sound);
    const customBanks = scopedBanks(context, 'phonemeBank', language, packLanguage);
    const candidateClip = async (source, scope) => {
      const clip = await portableClip(source, context, language, { source: 'recorded_bank', language: scope });
      if (clip.status === 'stale-language') { mismatch(clip); return null; }
      return clip.audio ? clip : null;
    };
    // Exact custom recordings belong to their declared teaching-language bank.
    for (const { bank, language: scope } of customBanks) {
      for (const source of core.soundBankSources(bank, key)) {
        const clip = await candidateClip(source, scope); if (clip) return clip;
      }
    }
    if (!defaultEnglish(language)) return null;
    const candidates = [...new Set([key, legacySoundAliases[key]].filter(Boolean))];
    for (const candidate of candidates) {
      checkAbort(context);
      const banks = candidate === key ? [] : customBanks;
      for (const { bank, language: scope } of [...banks, { bank: root.__ALLO_PHONEME_AUDIO_BANK, language: 'en-US' }]) {
        for (const source of core.soundBankSources(bank, candidate)) {
          const clip = await candidateClip(source, scope); if (clip) return clip;
        }
      }
      if (typeof root.getAudio === 'function') {
        const source = await boundedWait(root.getAudio('phonemes', candidate), 6000, 'The sound library took too long to respond.', context.signal);
        const clip = await candidateClip(source, 'en-US'); if (clip) return clip;
      }
    }
    return null;
  }
  async function prepareAudio(input, context = {}, onProgress) {
    const core = getCore(), pack = core.normalizeInput(input), errors = [];
    const finish = stopped => {
      const coverage = core.audioCoverage(pack), incomplete = coverage.words < coverage.totalWords || coverage.phonemes < coverage.totalPhonemes;
      pack.audioStatus = { ...coverage, cancelled: !!stopped, errors: [...new Set(errors)], message: stopped ? 'Preparation stopped. Completed recordings were kept.' : incomplete ? 'Some recordings are unavailable. Available clips were kept.' : 'All word and prepared sound recordings are ready.' };
      return pack;
    };
    try {
    checkAbort(context);
    const initialStale = pack.items.filter(item => item.wordAudioStatus === 'stale-language' || item.phonemes.some(sound => sound.audioStatus === 'stale-language'));
    initialStale.forEach(item => errors.push(staleAudioMessage(context, item.word)));
    const voicePref = String(context.selectedVoice || '').trim();
    const allowAfHeartShard = !/^(af_|am_|bf_|bm_)/i.test(voicePref) || voicePref.toLowerCase() === 'af_heart';
    if (typeof root.loadWordAudioBank === 'function' && pack.items.some(item => !item.wordAudio && defaultEnglish(core.fieldLanguage(item, 'term', pack.language)))) {
      try { await boundedWait(root.loadWordAudioBank(), 6000, 'The word library took too long to respond.', context.signal); }
      catch (error) { if (error.name === 'AbortError') throw error; }
    }
    if (allowAfHeartShard && typeof root.prefetchWordShardAudio === 'function') {
      const missingShardWords = [];
      const seenShardWords = new Set();
      for (const item of pack.items) {
        if (!item || item.wordAudio) continue;
        if (!defaultEnglish(core.fieldLanguage(item, 'term', pack.language))) continue;
        const wordKey = core.key(item.word);
        if (!wordKey || wordKey.includes(' ') || seenShardWords.has(wordKey)) continue;
        if (wordBankSources(root._CACHE_WORD_AUDIO_BANK, wordKey).length) continue;
        if (wordBankSources(root._CACHE_WORD_SHARD_CLIPS, wordKey).length) continue;
        seenShardWords.add(wordKey);
        missingShardWords.push(wordKey);
      }
      if (missingShardWords.length) {
        try { await boundedWait(root.prefetchWordShardAudio(missingShardWords, { signal: context.signal }), 8000, 'The word library took too long to respond.', context.signal); }
        catch (error) { if (error && error.name === 'AbortError') throw error; }
      }
    }
    await warmPhonemeBank(pack, context);
    let audioChars = pack.items.reduce((sum, item) => sum + item.wordAudio.length + (item.wordAudioOriginal ? item.wordAudioOriginal.audio.length : 0)
      + item.phonemes.reduce((n, sound) => n + sound.audio.length + (sound.audioOriginal ? sound.audioOriginal.audio.length : 0), 0), 0);
    const keep = clip => {
      if (!clip) return '';
      if (audioChars + clip.length > core.LIMITS.totalAudioChars) throw new Error('The set has reached its portable audio size limit. Split it into smaller lists.');
      audioChars += clip.length; return clip;
    };
    let ttsUnavailable = false;
    for (let index = 0; index < pack.items.length; index++) {
      checkAbort(context);
      const item = pack.items[index];
      const language = core.fieldLanguage(item, 'term', pack.language);
      const noteMismatch = (target, clip, phoneme) => {
        const name = phoneme ? 'audioOriginal' : 'wordAudioOriginal';
        if (!target[name]) target[name] = { audio: keep(clip.audio), provenance: clip.provenance };
        target[phoneme ? 'audioStatus' : 'wordAudioStatus'] = 'stale-language';
        errors.push(staleAudioMessage(context, item.word));
      };
      if (!item.wordAudio) {
        try {
          const wordKey = core.key(item.word);
          let clip = null;
          for (const { bank, language: scope } of scopedBanks(context, 'wordBank', language, pack.language)) {
            for (const source of wordBankSources(bank, wordKey)) {
              try {
                const candidate = await portableClip(source, context, language, { source: 'recorded_bank', language: scope });
                if (candidate.status === 'stale-language') noteMismatch(item, candidate, false);
                else if (candidate.audio) { clip = candidate; break; }
              } catch (error) {
                if (error.name === 'AbortError') throw error;
                errors.push(item.word + ': the custom recording could not be loaded. Trying another available recording.');
              }
            }
            if (clip) break;
          }
          if (!clip && defaultEnglish(language) && !wordKey.includes(' ')) {
            const bankList = allowAfHeartShard
              ? [root._CACHE_WORD_AUDIO_BANK, root._CACHE_WORD_SHARD_CLIPS]
              : [root._CACHE_WORD_AUDIO_BANK];
            let staleBank = false;
            for (const bank of bankList) {
              for (const source of wordBankSources(bank, wordKey)) {
                const candidate = await portableClip(source, context, language, { source: 'recorded_bank', language: 'en-US', provider: 'kokoro', resolvedVoice: 'af_heart' });
                if (candidate.status === 'stale-language') { noteMismatch(item, candidate, false); staleBank = true; break; }
                else if (candidate.audio) { clip = candidate; break; }
              }
              if (clip || staleBank) break;
            }
            if (!clip && !staleBank && allowAfHeartShard && typeof root.getWordShardAudio === 'function') {
              try {
                const shardSource = await boundedWait(root.getWordShardAudio(wordKey, { signal: context.signal }), 6000, 'The word library took too long to respond.', context.signal);
                if (shardSource) {
                  const candidate = await portableClip(shardSource, context, language, { source: 'recorded_bank', language: 'en-US', provider: 'kokoro', resolvedVoice: 'af_heart' });
                  if (candidate.status === 'stale-language') noteMismatch(item, candidate, false);
                  else if (candidate.audio) clip = candidate;
                }
              } catch (error) {
                if (error && error.name === 'AbortError') throw error;
              }
            }
          }
          if (!clip && !ttsUnavailable && typeof context.callTTS === 'function') {
            const voice = context.selectedVoice || undefined;
            let resolvedProfile = null;
            const source = await boundedWait(context.callTTS(item.word, voice, typeof context.ttsSpeed === 'number' ? context.ttsSpeed : undefined, {
              language, word: true,
              allowProviderFallback: !/^(af_|am_|bf_|bm_)/i.test(String(voice || '')),
              signal: context.signal,
              onResolvedProfile: profile => { resolvedProfile = profile && typeof profile === 'object' ? profile : null; }
            }), 45000, 'Word audio preparation timed out.', context.signal);
            checkAbort(context);
            const candidate = await portableClip(source, context, language, { ...resolvedProfile, source: 'synthesized', requestedLanguage: language });
            if (candidate.status === 'stale-language') noteMismatch(item, candidate, false);
            else if (candidate.audio) clip = candidate;
          }
          if (clip) {
            item.wordAudio = keep(clip.audio);
            item.wordAudioProvenance = clip.provenance;
            item.wordAudioStatus = clip.status;
          }
          else errors.push(item.word + ': no portable word recording is available.');
        } catch (error) {
          if (error.name === 'AbortError') throw error;
          if (/429|quota|rate.limit|timed out|size limit/i.test(error.message)) ttsUnavailable = true;
          errors.push(item.word + ': ' + core.text(error.message, 160));
        }
      }
      for (const sound of item.phonemes) {
        checkAbort(context);
        if (sound.audio) continue;
        try {
          const clip = await recordedSound(sound, context, language, pack.language, candidate => noteMismatch(sound, candidate, true));
          if (clip) { sound.audio = keep(clip.audio); sound.provenance = clip.provenance; sound.audioStatus = clip.status; }
        }
        catch (error) { if (error.name === 'AbortError') throw error; errors.push(item.word + ' /' + sound.label + '/: ' + core.text(error.message, 120)); }
      }
      if (typeof onProgress === 'function') onProgress({ completed: index + 1, total: pack.items.length, word: item.word, coverage: core.audioCoverage(pack) });
      if ((index + 1) % 10 === 0) { await new Promise(resolve => setTimeout(resolve, 0)); checkAbort(context); }
    }
    checkAbort(context);
    return finish(false);
    } catch (error) {
      if (error?.name === 'AbortError' && context.keepCompletedOnStop === true) return finish(true);
      throw error;
    }
  }
  function pcmWav(buffers, gapSeconds = 0) {
    if (!Array.isArray(buffers) || !buffers.length) return '';
    const first = buffers[0];
    const sampleRate = first && Number(first.sampleRate);
    if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error('Sound clips have an invalid sample rate.');
    if (buffers.some(buffer => !buffer || Number(buffer.sampleRate) !== sampleRate)) throw new Error('Sound clips use incompatible sample rates.');
    if (buffers.some(buffer => !Number.isFinite(Number(buffer.numberOfChannels)) || buffer.numberOfChannels < 1 || !Number.isFinite(Number(buffer.length)) || buffer.length < 0 || typeof buffer.getChannelData !== 'function')) {
      throw new Error('Sound clips contain invalid audio channel data.');
    }
    const safeGap = Number.isFinite(Number(gapSeconds)) && Number(gapSeconds) > 0 ? Number(gapSeconds) : 0;
    const gap = Math.round(sampleRate * safeGap);
    const length = buffers.reduce((sum, buffer) => sum + buffer.length, 0) + gap * (buffers.length - 1);
    if (length / sampleRate > 60) throw new Error('The sound sequence is longer than one minute.');
    const bytes = new Uint8Array(44 + length * 2), view = new DataView(bytes.buffer);
    const write = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
    write(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); write(8, 'WAVE'); write(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    write(36, 'data'); view.setUint32(40, length * 2, true);
    let offset = 44;
    buffers.forEach((buffer, index) => {
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel));
      for (let i = 0; i < buffer.length; i++) {
        const sample = Math.max(-1, Math.min(1, channels.reduce((sum, channel) => sum + channel[i], 0) / channels.length));
        view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true); offset += 2;
      }
      if (index < buffers.length - 1) offset += gap * 2;
    });
    return 'data:audio/wav;base64,' + bytesToBase64(bytes);
  }
  async function buildPptx(input, rawOptions = {}, sequence, context = {}) {
    const pictureSlidesOnly = !!(rawOptions && rawOptions.pictureSlidesOnly);
    const core = getCore(), pack = core.normalizeInput(input), options = core.normalizeOptions({ ...pack.options, ...rawOptions });
    const appearance = core.cardAppearance(options, context.readerSettings);
    const cardType = { italic: appearance.fontStyle === 'italic', bold: appearance.fontWeight === 700 };
    const semanticBold = appearance.fontWeight == null || appearance.fontWeight >= 600;
    const readingSize = Number(context.readerSettings && context.readerSettings.baseFontSize);
    const readingScale = Number.isFinite(readingSize) && readingSize > 0 ? Math.max(10, Math.min(48, readingSize)) / 16 : 1;
    const textScale = appearance.textScale * readingScale;
    const wordScale = (appearance.wordScale || appearance.textScale) * readingScale;
    const meaningScale = (appearance.meaningScale || appearance.textScale) * readingScale;
    const translationScale = (appearance.translationScale || appearance.textScale) * readingScale;
    const font = appearance.fontFace.toLowerCase();
    const fontWidth = font === 'verdana' ? 1.12 : font === 'georgia' ? 1.08 : 1;
    const sourceLanguage = core.languageInfo(pack.language);
    const itemLanguage = (item, field) => core.languageInfo(core.fieldLanguage(item, field, pack.language));
    const uiLanguage = core.languageInfo(context.currentUiLanguage || context.uiLanguage || '');
    // PptxGenJS reads language from text options, not presentation.lang/theme.
    // "und" prevents its English default from mislabelling unknown languages.
    const textLanguage = info => ({ lang: info.tag || 'und', rtlMode: info.dir === 'rtl' });
    const localized = (name, fallback, params = {}) => {
      const key = name === 'picture_credits' ? 'flashcards.picture_credits' : 'word_practice.' + name;
      let value = context.labels && context.labels[name];
      if (typeof value !== 'string' || !value.trim() || value.trim() === key) {
        try { value = typeof context.t === 'function' ? context.t(key) : ''; } catch (_) { value = ''; }
      }
      const translated = typeof value === 'string' && !!value.trim() && value.trim() !== key && value !== fallback;
      let text = translated ? value : fallback;
      Object.keys(params).forEach(key => { text = text.split('{' + key + '}').join(String(params[key])); });
      return { text, language: translated ? uiLanguage : core.languageInfo('English') };
    };
    const L = (name, fallback, params) => localized(name, fallback, params).text;
    const uiText = (slide, name, fallback, box, params, preparedLabel) => {
      const label = preparedLabel || localized(name, fallback, params);
      const fontSize = box.fontSize > 20 ? fittedFont(label.text, box, box.fontSize) : box.fontSize;
      const fittedBox = { ...box };
      if (box.fontSize > 20) delete fittedBox.fit;
      // Explicit lines avoid fallback-font wrapping artifacts in italic prompts.
      const margin = typeof box.margin === 'number' ? box.margin * 144 : 0;
      const lines = cardType.italic && box.fontSize > 20 ? readableTextLines(label.text, (box.w * 72 - margin) / fontSize / fontWidth) : [label.text];
      const text = lines.reduce((value, line, index) => value + (index && !/[\r\n]$/.test(lines[index - 1]) ? '\n' : '') + line, '');
      slide.addText(text, { ...fittedBox, fontFace: appearance.fontFace, ...cardType, fontSize, ...textLanguage(label.language) });
    };
    checkAbort(context);
    if (typeof context.ensurePptx === 'function') await context.ensurePptx();
    checkAbort(context);
    const Constructor = context.PptxGenJS || root.PptxGenJS;
    if (typeof Constructor !== 'function') throw new Error(L('pptx_unavailable', 'PowerPoint export is unavailable. Reconnect once to load the PowerPoint exporter, then try again.'));
    const cards = Array.isArray(sequence) ? sequence : core.createSequence(pack, options);
    if (!cards.length) throw new Error(L('need_words', 'Add at least one word to begin.'));
    const pptx = new Constructor();
    pptx.layout = 'LAYOUT_WIDE'; pptx.author = 'AlloFlow'; pptx.subject = 'Classroom word practice'; pptx.title = pack.title;
    pptx.company = 'AlloFlow'; pptx.theme = { headFontFace: appearance.fontFace, bodyFontFace: appearance.fontFace };
    const warnings = new Set(), items = new Map(pack.items.map(item => [item.id, item])), decoded = new Map(), converted = new Map(), sequences = new Map();
    if (options.includeAudio) pack.items.forEach(item => {
      if (item.wordAudioStatus === 'stale-language' || item.phonemes.some(sound => sound.audioStatus === 'stale-language')) warnings.add(staleAudioMessage(context, item.word));
    });
    let audioContext;
    const decode = async source => {
      if (!decoded.has(source)) decoded.set(source, (async () => {
        const Context = context.AudioContext || root.AudioContext || root.webkitAudioContext;
        if (!Context) throw new Error('This browser cannot convert the recording to PowerPoint audio.');
        if (!audioContext) audioContext = new Context();
        const buffer = await audioContext.decodeAudioData(dataBytes(source).buffer);
        if (buffer.duration > 60) throw new Error('The audio clip is longer than one minute.');
        return buffer;
      })());
      return decoded.get(source);
    };
    const wordMedia = async source => {
      if (!source) return '';
      if (/^data:audio\/(mpeg|mp3|wav|x-wav|wave);/i.test(source)) return source;
      if (!converted.has(source)) converted.set(source, decode(source).then(buffer => pcmWav([buffer])));
      return converted.get(source);
    };
    const soundsMedia = async item => {
      if (!item.phonemes.length || item.phonemes.some(sound => !sound.audio)) return '';
      if (!sequences.has(item.id)) sequences.set(item.id, Promise.all(item.phonemes.map(sound => decode(sound.audio))).then(buffers => pcmWav(buffers, 0.2)));
      return sequences.get(item.id);
    };
    function slideBase(label) {
      const slide = pptx.addSlide(); slide.background = { color: appearance.background };
      const title = pack.title === 'Word Fluency Pop-Up' ? localized('mode_popup', 'Word Fluency Pop-Up') : { text: pack.title, language: sourceLanguage };
      const heading = title.text.replace(/\s+/gu, ' ');
      const titleBox = { x: 0.55, y: 0.2, w: 12.2, h: 0.4, margin: 0 };
      // Reserve a little more header space for long titles; PowerPoint does not
      // reliably apply automatic shrinking when a deck is opened elsewhere.
      if (readableTextLines(heading, titleBox.w * 72 / 16 / fontWidth).length > 1) { titleBox.y = 0.15; titleBox.h = 0.65; }
      slide.addText(heading, { ...titleBox, fontFace: appearance.fontFace, fontSize: fittedFont(heading, titleBox, 16, 10), color: appearance.muted, align: title.language.dir === 'rtl' ? 'right' : 'left', valign: 'top', ...textLanguage(title.language) });
      slide.addText(label.map((part, index) => ({ text: (index ? ' · ' : '') + part.text, options: textLanguage(part.language) })), { x: 0.55, y: 6.96, w: 12.2, h: 0.25, fontSize: 12, color: appearance.muted, margin: 0, align: label[0].language.dir === 'rtl' ? 'right' : 'left', ...textLanguage(label[0].language) });
      return slide;
    }
    function mainWord(slide, word, card, item, fixed = false) {
      const left = card.position && card.position.endsWith('left'), right = card.position && card.position.endsWith('right');
      const corner = !fixed && (left || right);
      const box = corner ? { x: left ? 0.6 : 6.7, y: card.position.startsWith('top') ? 1.2 : 3.65, w: 6, h: 2.1 } : { x: 0.7, y: 2.0, w: 11.9, h: 2.6 };
      const longest = Math.max(...word.split(/\s+/).map(part => sentenceSegments(part).length));
      let fontSize = Math.max(19, Math.min(100 * wordScale * (Number(card.scale) || 1), (corner ? 580 : 1080) / Math.max(6, longest) / fontWidth));
      const width = box.w * 72 - 7.2, height = box.h * 72 - 7.2;
      const tokens = word.match(/\r\n|[\r\n]|[^\S\r\n]+|[^\s]+/gu) || [];
      const widths = tokens.map(token => sentenceSegments(token).reduce((sum, part) => sum + sentenceWidth(part.text), 0));
      const lineCount = size => {
        let lines = 1, used = 0;
        tokens.forEach((token, index) => {
          if (/^[\r\n]/.test(token)) { lines++; used = 0; return; }
          const tokenWidth = widths[index] * size * fontWidth;
          if (/^\s/u.test(token)) { used = Math.min(width, used + tokenWidth); return; }
          if (used && used + tokenWidth > width) { lines++; used = 0; }
          // A single long token wraps between graphemes in the text box.
          const extraLines = Math.max(0, Math.ceil(tokenWidth / width) - 1);
          lines += extraLines; used += tokenWidth - extraLines * width;
        });
        return lines;
      };
      while (fontSize > 12 && lineCount(fontSize) * fontSize * 1.35 > height) fontSize = Math.max(12, fontSize - 1);
      slide.addText(word, { ...box, fontFace: appearance.fontFace, ...cardType, fontSize, bold: semanticBold, color: appearance.heading, align: 'center', valign: 'mid', margin: 0.05, breakLine: false, ...textLanguage(itemLanguage(item, 'term')) });
    }
    async function addAudio(slide, item, footer, kind = 'both') {
      if (!options.includeAudio) return;
      let word = '', sounds = '';
      if (kind !== 'sounds') {
        if (item.wordAudio) {
          try { word = await wordMedia(item.wordAudio); }
          catch (_) { warnings.add(L('pptx_word_audio_failed', 'Word audio for “{word}” could not be converted for PowerPoint.', { word: item.word })); }
        } else warnings.add(L('pptx_word_audio_missing', 'No word recording is included for “{word}”.', { word: item.word }));
      }
      if (kind !== 'word' && item.phonemes.length) {
        if (item.phonemes.some(sound => !sound.audio)) warnings.add(L('pptx_sounds_incomplete', 'The sound sequence for “{word}” is incomplete and was not included.', { word: item.word }));
        else try { sounds = await soundsMedia(item); } catch (_) { warnings.add(L('pptx_sounds_failed', 'The sound sequence for “{word}” could not be converted for PowerPoint.', { word: item.word })); }
      }
      checkAbort(context);
      const capacityError = () => new Error(L('pptx_audio_caption_too_wide', 'A playback caption contains a character group that cannot fit at the minimum readable size. Shorten the caption and try exporting again.'));
      const captionPlan = async (caption, box) => {
        const complex = sentenceSegments(caption.text).some(part => instructionBases(part.text).length > 1);
        const leading = complex ? 1.55 : 1.35;
        const inset = target => typeof target.margin === 'number' ? target.margin * 144 : 0;
        const widthFor = (target, size) => (target.w * 72 - inset(target)) / size / fontWidth;
        const linesFor = (value, target, size) => readableTextLines(value, widthFor(target, size), instructionWidth);
        const fits = (value, lines, target, size) => instructionLineCount(lines) * size * leading <= target.h * 72 - inset(target)
          && sentenceSegments(value).every(part => /[\r\n]/.test(part.text) || instructionWidth(part.text) <= widthFor(target, size));
        const legacySize = fittedFont(caption.text, box, 14, 10);
        const legacyLines = readableTextLines(caption.text, box.w * 72 / legacySize / fontWidth);
        const checkedLines = linesFor(caption.text, box, legacySize);
        if (fits(caption.text, checkedLines, box, legacySize) && legacyLines.length === checkedLines.length && legacyLines.every((line, index) => line === checkedLines[index])) {
          return [{ lines: checkedLines, box, fontSize: legacySize }];
        }
        const expanded = { ...box, h: 6.9 - box.y };
        for (let size = 14; size >= 10; size--) {
          const lines = linesFor(caption.text, expanded, size);
          if (fits(caption.text, lines, expanded, size)) return [{ lines, box: expanded, fontSize: size }];
        }
        const take = (value, target, size) => {
          const lines = linesFor(value, target, size);
          let count = Math.min(lines.length, Math.floor((target.h * 72 - inset(target)) / size / leading));
          while (count > 0) {
            const selected = lines.slice(0, count), text = selected.join('');
            if (text.length && fits(text, selected, target, size)) return { lines: selected, box: target, fontSize: size, consumed: text.length };
            count--;
          }
          return null;
        };
        const first = take(caption.text, expanded, 10);
        if (!first) throw capacityError();
        const parts = [first], body = { x: 0.85, y: 1, w: 11.65, h: 5.5, margin: 0.1 };
        const preferred = Math.max(14, Math.min(28, 14 * textScale));
        let rest = caption.text.slice(first.consumed);
        while (rest) {
          checkAbort(context);
          let part = null;
          for (let size = preferred; !part;) {
            part = take(rest, body, size);
            if (part || size === 10) break;
            size = Math.max(10, size - 1);
          }
          if (!part || part.consumed <= 0) throw capacityError();
          parts.push(part); rest = rest.slice(part.consumed);
          await sentencePageYield();
        }
        return parts;
      };
      const entries = [];
      const sources = [[word, 'hear_word', 'Hear word'], [sounds, 'hear_sounds', 'Hear sounds']];
      for (let index = 0; index < sources.length; index++) {
        const [source, name, fallback] = sources[index];
        if (!source) continue;
        const caption = localized(name, fallback), rtl = caption.language.dir === 'rtl', start = 0.75 + index * 6;
        const box = { x: start + (rtl ? 0 : 0.58), y: 6.06, w: 4.9, h: 0.45, margin: 0 };
        entries.push({ source, caption, rtl, start, parts: await captionPlan(caption, box) });
      }
      const addCaption = (page, entry, part) => {
        const lines = part.lines;
        const text = lines.length === 1 ? lines[0] : lines.map((line, index) => ({ text: line, options: { breakLine: index < lines.length - 1 && !/[\r\n]$/.test(line) } }));
        page.addText(text, { ...part.box, fontFace: appearance.fontFace, ...cardType, fontSize: part.fontSize, color: appearance.accent, align: entry.rtl ? 'right' : 'left', valign: 'top', paraSpaceAfterPt: 0, ...textLanguage(entry.caption.language) });
      };
      checkAbort(context);
      for (const entry of entries) {
        const x = entry.start + (entry.rtl ? 5.15 : 0);
        // PptxGenJS expects an extension-bearing audio MIME and base64 payload.
        const data = entry.source.replace(/^data:audio\/(mpeg|mp3);/i, 'audio/mp3;').replace(/^data:audio\/(x-wav|wave|wav);/i, 'audio/wav;');
        slide.addMedia({ type: 'audio', data, x, y: 6.03, w: 0.48, h: 0.48 });
        addCaption(slide, entry, entry.parts[0]);
      }
      const total = 1 + entries.reduce((sum, entry) => sum + entry.parts.length - 1, 0);
      let pageNumber = 1;
      for (const entry of entries) {
        for (let index = 1; index < entry.parts.length; index++) {
          checkAbort(context);
          const page = slideBase([...footer, localized('pptx_part', 'Part {n}/{total}', { n: ++pageNumber, total })]);
          addCaption(page, entry, entry.parts[index]);
          await sentencePageYield();
        }
      }
    }
    // Annotation pages keep editable shapes and text, plus playable voice notes.
    // They follow the answer so a saved teacher note cannot reveal a recall prompt.
    const annotatedItems = new Set();
    async function addAnnotationSlides(item, footer) {
      if (!item.annotations || !item.annotations.length || annotatedItems.has(item.id)) return;
      annotatedItems.add(item.id);
      const slide = slideBase([...footer, localized('annotations', 'Annotations')]);
      vocabularyHeading(slide, item);
      const viewport = item.annotationViewport || { width: 1000, height: 600 };
      const sx = 11.3 / viewport.width, sy = 4.7 / viewport.height;
      const x = n => Math.max(1, Math.min(12, 1 + (Number(n) || 0) * sx));
      const y = n => Math.max(1.8, Math.min(6.1, 1.8 + (Number(n) || 0) * sy));
      const colors = Object.assign(Object.create(null), { yellow: 'FEF08A', blue: '93C5FD', green: '86EFAC', pink: 'F9A8D4', purple: 'D8B4FE', red: 'DC2626', black: '111827' });
      const stickers = Object.assign(Object.create(null), { star: '⭐', check: '✅', idea: '💡', love: '❤️', question: '❓', important: '❗', fire: '🔥', target: '🎯', thumbsup: '👍', party: '🎉', rocket: '🚀', flag: '🚩' });
      const notes = [];
      for (const a of item.annotations) {
        checkAbort(context);
        const color = colors[a.color] || (/^#[a-f0-9]{6}$/i.test(a.color) ? a.color.slice(1) : 'FDE68A');
        const box = { x: x(a.x), y: y(a.y), w: Math.min(3.2, 12.3 - x(a.x)), h: Math.min(0.65, 6.8 - y(a.y)) };
        if (a.kind === 'draw' && typeof slide.addShape === 'function') {
          const line = { color, width: Math.max(1, Math.min(8, a.width || 4)) };
          const segment = (p, q, arrow) => slide.addShape('line', { x: Math.min(x(p.x), x(q.x)), y: Math.min(y(p.y), y(q.y)), w: Math.max(.001, Math.abs(x(q.x) - x(p.x))), h: Math.max(.001, Math.abs(y(q.y) - y(p.y))), flipH: q.x < p.x, flipV: q.y < p.y, line: { ...line, ...(arrow ? { endArrowType: 'triangle' } : {}) } });
          if (a.shape === 'rect' || a.shape === 'circle') slide.addShape(a.shape === 'rect' ? 'rect' : 'ellipse', { x: x(a.x), y: y(a.y), w: Math.max(.02, Math.min(12.3 - x(a.x), (a.w || 1) * sx)), h: Math.max(.02, Math.min(6.8 - y(a.y), (a.h || 1) * sy)), line, fill: { color, transparency: 100 } });
          else if (a.start && a.end) segment(a.start, a.end, a.shape === 'arrow');
          else (a.points || []).slice(1).forEach((point, i) => segment(a.points[i], point));
        } else if (a.kind === 'highlight') {
          if (typeof slide.addShape === 'function') (a.rects || []).forEach(r => slide.addShape('rect', { x: x(r.x), y: y(r.y), w: Math.max(.02, Math.min(12.3 - x(r.x), r.w * sx)), h: Math.max(.02, Math.min(6.8 - y(r.y), r.h * sy)), fill: { color, transparency: 45 }, line: { color, transparency: 100 } }));
          if (a.text) {
            const first = (a.rects || [])[0] || a;
            slide.addText(a.text, { x: x(first.x), y: y(first.y), w: Math.min(4, 12.3 - x(first.x)), h: Math.min(.8, 6.8 - y(first.y)), fontFace: appearance.fontFace, fontSize: 14, color: '172554', fill: { color }, margin: .04, fit: 'shrink', ...textLanguage(itemLanguage(item, 'example')) });
            notes.push(a.text);
          }
        } else if (a.kind === 'voice') {
          const audio = core.safeAudio('data:' + a.mimeType + ';base64,' + a.audioBase64);
          if (audio) {
            try { const data = (await wordMedia(audio)).replace(/^data:audio\/(mpeg|mp3);/i, 'audio/mp3;').replace(/^data:audio\/(x-wav|wave|wav);/i, 'audio/wav;'); slide.addMedia({ type: 'audio', data, x: box.x, y: box.y, w: .45, h: .45 }); }
            catch (_) { warnings.add(L('pptx_annotation_audio_failed', 'A voice annotation for “{word}” could not be converted for PowerPoint.', { word: item.word })); }
          }
        } else {
          const value = a.kind === 'note' ? a.content : stickers[a.type] || '⭐';
          slide.addText(value, { ...box, fontFace: appearance.fontFace, fontSize: a.kind === 'note' ? 14 : 24, color: '172554', fill: { color }, margin: .05, fit: 'shrink', ...textLanguage(itemLanguage(item, 'definition')) });
          if (a.kind === 'note' && a.content) notes.push(a.content);
        }
      }
      if (notes.length && typeof slide.addNotes === 'function') slide.addNotes(notes.join('\n\n'));
      // Full note/selection text gets readable continuation pages as well as pins.
      for (const note of notes) for (const text of sentenceTextPages(note)) {
        const detail = slideBase([...footer, localized('annotations', 'Annotations')]);
        addSentenceText(detail, text, itemLanguage(item, 'definition'), false);
      }
    }
    let textSegments = null;
    try { if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') textSegments = new Intl.Segmenter(undefined, { granularity: 'grapheme' }); } catch (_) {}
    // Sentence pages preserve authored whitespace and whole graphemes. The
    // conservative line budget leaves room for font substitution in PowerPoint.
    const sentenceSegments = value => {
      if (textSegments) {
        try { return Array.from(textSegments.segment(value), part => ({ text: part.segment, index: part.index })); }
        catch (_) { textSegments = null; }
      }
      // Keep common marks, joined emoji, flags and conjoining syllables whole
      // without treating an entire marked word as one font-width unit.
      const hangul = text => {
        const point = text.codePointAt(0);
        return point >= 0x1100 && point <= 0x115f || point >= 0xa960 && point <= 0xa97c ? 'L'
          : point >= 0x1160 && point <= 0x11a7 || point >= 0xd7b0 && point <= 0xd7c6 ? 'V'
          : point >= 0x11a8 && point <= 0x11ff || point >= 0xd7cb && point <= 0xd7fb ? 'T'
          : point >= 0xac00 && point <= 0xd7a3 ? ((point - 0xac00) % 28 ? 'LVT' : 'LV') : '';
      };
      const viramaTail = /[\u094d\u09cd\u0a4d\u0acd\u0b4d\u0bcd\u0c4d\u0ccd\u0d4d\u0dca\u1039\u103a\u17d2][\p{Mark}\u200c\u200d]*$/u;
      const parts = []; let index = 0, regionalCount = 0, lastHangul = '';
      for (const text of value) {
        const previous = parts[parts.length - 1], currentHangul = hangul(text);
        const regional = /\p{Regional_Indicator}/u.test(text);
        const extending = /[\p{Mark}\u200c\u200d\u{1f3fb}-\u{1f3ff}\u{e0020}-\u{e007f}]/u.test(text);
        const syllable = (lastHangul === 'L' && ['L', 'V', 'LV', 'LVT'].includes(currentHangul))
          || (['LV', 'V'].includes(lastHangul) && ['V', 'T'].includes(currentHangul))
          || (['LVT', 'T'].includes(lastHangul) && currentHangul === 'T');
        const joined = previous && !/[\r\n\t]/.test(previous.text) && !/[\r\n\t]/.test(text) && (extending || previous.text.endsWith('\u200d') || syllable || (viramaTail.test(previous.text) && /\p{Letter}/u.test(text)) || (regional && regionalCount % 2));
        if (joined || (previous && previous.text === '\r' && text === '\n')) previous.text += text;
        else parts.push({ text, index });
        index += text.length; regionalCount = regional ? regionalCount + 1 : 0; lastHangul = currentHangul;
      }
      return parts;
    };
    const sentenceWidth = value => /\s/u.test(value) ? 0.35 : /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}]/u.test(value) ? 1.1 : /[A-ZMW]/.test(value) ? 0.85 : /^[\x00-\x7f]/.test(value) ? 0.65 : 0.9;
    function sentenceTextPages(value, maxLines = Math.max(1, Math.floor(9 / textScale)), maxWidth = 26 / textScale / fontWidth) {
      const pages = []; let remaining = value;
      while (remaining) {
        let lines = 1, width = 0, end = remaining.length, lastBreak = 0;
        for (const part of sentenceSegments(remaining)) {
          if (/[\r\n]/.test(part.text)) { lines++; width = 0; }
          else { const size = sentenceWidth(part.text); if (width + size > maxWidth) { lines++; width = 0; } width += size; }
          if (lines > maxLines) { end = part.index || part.text.length; break; }
          if (/\s/u.test(part.text)) lastBreak = part.index + part.text.length;
        }
        if (end < remaining.length && lastBreak > end * 0.65) end = lastBreak;
        pages.push(remaining.slice(0, end)); remaining = remaining.slice(end);
      }
      return pages;
    }
    function sentenceChoicePages(choices) {
      const pages = []; let page = '';
      choices.forEach((choice, index) => {
        const line = String.fromCharCode(65 + index) + '. ' + choice;
        const parts = sentenceTextPages(line);
        if (parts.length > 1) { if (page) pages.push(page); pages.push(...parts); page = ''; return; }
        const candidate = page ? page + '\n' + line : line;
        if (page && sentenceTextPages(candidate).length > 1) { pages.push(page); page = line; }
        else page = candidate;
      });
      if (page) pages.push(page);
      return pages;
    }
    const sentencePageYield = async () => { await new Promise(resolve => setTimeout(resolve, 0)); checkAbort(context); };
    function addSentenceText(slide, text, language, choices = false) {
      const box = { x: 0.85, y: 1.0, w: 11.65, h: 5.5, margin: 0.1 };
      slide.addText(text, { ...box, fontFace: appearance.fontFace, ...cardType, fontSize: fittedFont(text, box, 28 * textScale), color: choices ? appearance.accent : appearance.heading, align: language.dir === 'rtl' ? 'right' : 'left', valign: 'top', paraSpaceAfterPt: 0, ...textLanguage(language) });
    }
    // Estimate word wrapping as well as explicit line breaks. Keep each source
    // character in exactly one line, including spaces and joined graphemes.
    function readableTextLines(value, maxWidth, measure = sentenceWidth) {
      const lines = []; let start = 0, width = 0;
      for (const token of value.matchAll(/\r\n|[\r\n]|[^\S\r\n]+|[^\s]+/gu)) {
        const parts = sentenceSegments(token[0]);
        const tokenWidth = parts.reduce((sum, part) => sum + measure(part.text), 0);
        if (!/^\s/u.test(token[0]) && tokenWidth <= maxWidth && width && width + tokenWidth > maxWidth) {
          lines.push(value.slice(start, token.index)); start = token.index; width = 0;
        }
        for (const part of parts) {
          const index = token.index + part.index;
          if (/[\r\n]/.test(part.text)) {
            // The fallback segmenter exposes CRLF as two code points.
            if (part.text === '\n' && value[index - 1] === '\r') { lines[lines.length - 1] += part.text; start = index + 1; continue; }
            lines.push(value.slice(start, index + part.text.length)); start = index + part.text.length; width = 0; continue;
          }
          const size = measure(part.text);
          if (width && width + size > maxWidth) { lines.push(value.slice(start, index)); start = index; width = 0; }
          width += size;
        }
      }
      lines.push(value.slice(start));
      return lines;
    }
    function fittedFont(value, box, preferred, minimum = 12) {
      let fontSize = preferred;
      const margin = typeof box.margin === 'number' ? box.margin * 144 : 0;
      const width = box.w * 72 - margin, height = box.h * 72 - margin;
      while (fontSize > minimum && readableTextLines(value, width / fontSize / fontWidth).length * fontSize * 1.35 > height) fontSize = Math.max(minimum, fontSize - 1);
      return fontSize;
    }
    // Instruction labels use their own conservative width budget: a fallback
    // font can display the base letters of one grapheme as separate glyphs.
    const instructionBases = value => Array.from(value).filter(char => !/[\p{Mark}\u200c\u200d\u{1f3fb}-\u{1f3ff}\u{e0020}-\u{e007f}]/u.test(char));
    const instructionWidth = value => Math.max(sentenceWidth(value), instructionBases(value).reduce((sum, char) => sum + sentenceWidth(char), 0));
    const instructionLineCount = lines => lines.length + (/[\r\n]$/.test(lines[lines.length - 1] || '') ? 1 : 0);
    function instructionLayout(name, fallback, box) {
      const label = localized(name, fallback), inset = target => typeof target.margin === 'number' ? target.margin * 144 : 0;
      const margin = inset(box);
      const linesFor = (value, target, size) => readableTextLines(value, (target.w * 72 - inset(target)) / size / fontWidth, instructionWidth);
      const legacySize = Math.max(12, box.fontSize > 20 ? fittedFont(label.text, box, box.fontSize) : box.fontSize);
      const complex = sentenceSegments(label.text).some(part => instructionBases(part.text).length > 1);
      if (instructionLineCount(linesFor(label.text, box, legacySize)) * legacySize * (complex ? 1.55 : 1.35) <= box.h * 72 - margin) {
        return { name, fallback, label, legacy: true, box: legacySize === box.fontSize || box.fontSize >= 12 ? box : { ...box, fontSize: 12 }, parts: [null] };
      }
      const expanded = { ...box, h: Math.max(box.h, 5.9 - box.y) };
      delete expanded.fit;
      const fits = (lines, size, target) => instructionLineCount(lines) * size * 1.55 <= target.h * 72 - inset(target);
      let size = Math.max(12, box.fontSize), lines = linesFor(label.text, expanded, 12);
      if (fits(lines, 12, expanded)) {
        lines = linesFor(label.text, expanded, size);
        while (size > 12 && !fits(lines, size, expanded)) { size = Math.max(12, size - 1); lines = linesFor(label.text, expanded, size); }
        return { name, fallback, label, box, parts: [{ lines, box: expanded, fontSize: size }] };
      }
      const takeLines = (value, target, fontSize) => {
        const available = Math.max(2, Math.floor((target.h * 72 - inset(target)) / fontSize / 1.55));
        const all = linesFor(value, target, fontSize); let count = Math.min(available, all.length);
        while (count > 1 && instructionLineCount(all.slice(0, count)) > available) count--;
        return all.slice(0, count);
      };
      const first = takeLines(label.text, expanded, 12), parts = [{ lines: first, box: expanded, fontSize: 12 }];
      let rest = label.text.slice(first.join('').length);
      const body = { x: 0.85, y: 1, w: 11.65, h: 5.5, margin: 0.1 };
      const bodySize = Math.max(12, Math.min(28, box.fontSize));
      while (rest) {
        const lines = takeLines(rest, body, bodySize), length = lines.join('').length;
        if (!length) break;
        parts.push({ lines, box: body, fontSize: bodySize }); rest = rest.slice(length);
      }
      return { name, fallback, label, box, parts };
    }
    const instructionFooter = (footer, plan, page = 1) => plan.parts.length > 1
      ? [...footer, localized('pptx_part', 'Part {n}/{total}', { n: page, total: plan.parts.length })] : footer;
    async function addInstruction(slide, plan, footer) {
      if (plan.legacy) { uiText(slide, plan.name, plan.fallback, plan.box, undefined, plan.label); return; }
      for (let index = 0; index < plan.parts.length; index++) {
        const part = plan.parts[index], page = index ? slideBase(instructionFooter(footer, plan, index + 1)) : slide;
        const runs = part.lines.map((text, line) => ({ text, options: { breakLine: line < part.lines.length - 1 && !/[\r\n]$/.test(text) } }));
        page.addText(runs, { ...part.box, fontFace: appearance.fontFace, ...cardType, fontSize: part.fontSize, color: plan.box && plan.box.color || appearance.muted, align: plan.label.language.dir === 'rtl' ? 'right' : 'left', valign: 'top', paraSpaceAfterPt: 0, ...textLanguage(plan.label.language) });
        if (index) await sentencePageYield();
      }
    }
    const vocabularyBudget = 6.8 / textScale;
    function vocabularyParts(section) {
      const scale = section.textScale || meaningScale;
      const vocabularyWidth = 27 / scale / fontWidth;
      const vocabularyLineLimit = Math.max(1, Math.floor(6.8 / scale - 0.4));
      const labelLength = section.label ? section.label.text.length : 0;
      const value = (section.label ? section.label.text : '') + section.text;
      const lines = readableTextLines(value, vocabularyWidth), parts = [];
      let offset = 0;
      for (let index = 0; index < lines.length;) {
        let count = Math.min(vocabularyLineLimit, lines.length - index);
        // Avoid leaving a single content line on a continuation page.
        if (count > 1 && lines.length - index - count === 1 && lines[lines.length - 1]) count--;
        // A trailing newline creates another visible line in PowerPoint.
        if (count > 1 && count === vocabularyLineLimit && /[\r\n]$/.test(lines[index + count - 1])) count--;
        // A translation caption belongs with its first content line, even
        // when large text leaves a one-line page budget. The box fits the pair.
        if (offset < labelLength) {
          let length = lines.slice(index, index + count).join('').length;
          while (offset + length <= labelLength && index + count < lines.length) {
            length += lines[index + count].length;
            count++;
          }
        }
        const text = lines.slice(index, index + count).join(''); index += count;
        if (!text) continue;
        const labelEnd = Math.min(labelLength, offset + text.length);
        const part = { ...section, text: value.slice(Math.max(offset, labelLength), offset + text.length),
          label: offset < labelLength ? { ...section.label, text: value.slice(offset, labelEnd) } : null,
          weight: (readableTextLines(text, vocabularyWidth).length + 0.4) * scale / textScale };
        parts.push(part); offset += text.length;
      }
      return parts;
    }
    // prompt: the meaning-first question shown in place of the word.
    function vocabularyHeading(slide, item, prompt) {
      // Pasted line breaks are whitespace within a term, not forced title rows.
      const heading = (prompt ? prompt.text : item.word).replace(/\s+/gu, ' ');
      let fontSize = 48 * (prompt ? textScale : wordScale);
      while (fontSize > 12 && readableTextLines(heading, 11.7 * 72 / fontSize / fontWidth).length * fontSize * 1.35 > 1.05 * 72) fontSize = Math.max(12, fontSize - 1);
      slide.addText(heading, { x: 0.8, y: 0.92, w: 11.7, h: 1.05, fontFace: appearance.fontFace, ...cardType, fontSize, color: appearance.heading, bold: semanticBold, align: 'center', valign: 'mid', margin: 0, ...textLanguage(prompt ? prompt.language : itemLanguage(item, 'term')) });
    }
    // Natural size from the file header (PNG IHDR, GIF screen, JPEG start-of-frame), so a
    // picture is fitted without stretching. PowerPoint embeds PNG, JPEG and GIF only.
    function pictureDimensions(src) {
      const match = /^data:image\/(png|jpeg|gif);base64,(.+)$/i.exec(src || '');
      if (!match) return null;
      let bytes;
      try { bytes = atob(match[2].slice(0, 262144)); } catch (_) { return null; }
      const type = match[1].toLowerCase(), at = i => bytes.charCodeAt(i);
      let size = null;
      if (type === 'png' && bytes.length >= 24) size = { w: ((at(16) << 24) | (at(17) << 16) | (at(18) << 8) | at(19)) >>> 0, h: ((at(20) << 24) | (at(21) << 16) | (at(22) << 8) | at(23)) >>> 0 };
      else if (type === 'gif' && bytes.length >= 10) size = { w: at(6) | (at(7) << 8), h: at(8) | (at(9) << 8) };
      else if (type === 'jpeg' && bytes.length >= 4 && at(0) === 0xff && at(1) === 0xd8) {
        for (let i = 2; i < bytes.length;) {
          if (at(i) !== 0xff) { i++; continue; }
          while (i < bytes.length && at(i) === 0xff) i++;
          if (i >= bytes.length) break;
          const marker = at(i++);
          if (marker === 0x00) continue;
          if (marker === 0xda || marker === 0xd9) break;
          if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
          if (i + 2 > bytes.length) break;
          const segLen = (at(i) << 8) | at(i + 1);
          if (segLen < 2) break;
          if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
            if (segLen >= 7 && i + 7 <= bytes.length) size = { w: (at(i + 5) << 8) | at(i + 6), h: (at(i + 3) << 8) | at(i + 4) };
            break;
          }
          i += segLen;
        }
      }
      return size && size.w > 0 && size.h > 0 ? size : null;
    }
    function pictureCreditPages(credit) {
      const width = 11.3 * 72 / 12 / fontWidth * 0.92;
      const lines = readableTextLines(credit, width), pages = [];
      for (let index = 0; index < lines.length;) {
        const limit = pages.length ? 17 : 6;
        let count = Math.min(limit, lines.length - index);
        if (count > 1 && /[\r\n]$/.test(lines[index + count - 1])) count--;
        const part = lines.slice(index, index + count); index += count;
        if (!part.join('')) continue;
        const rows = part.length + (/[\r\n]$/.test(part[part.length - 1]) ? 1 : 0);
        const text = part.length === 1 ? part[0] : part.map((line, n) => ({ text: line, options: { breakLine: n < part.length - 1 && !/[\r\n]$/.test(line) } }));
        pages.push({ text, height: Math.max(0.4, rows * 0.25) });
      }
      return pages;
    }
    function addPictureCredit(slide, part, y, credit) {
      const first = credit.match(/\p{L}/u)?.[0] || '';
      const rtl = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}\p{Script=Samaritan}\p{Script=Mandaic}]/u.test(first);
      slide.addText(part.text, { x: 1.0, y, w: 11.3, h: part.height, fontFace: appearance.fontFace, ...cardType, fontSize: 12, color: appearance.muted, align: rtl ? 'right' : part.height > 0.4 ? 'left' : 'center', valign: 'top', margin: 0, lang: 'und', rtlMode: rtl, paraSpaceAfterPt: 0 });
    }
    // The word with its picture, before the meaning slides: word, picture, then meaning.
    function addPictureSlide(item, footer, prompt, withAudio = false) {
      const picture = options.includePictures && item.picture, size = picture && pictureDimensions(picture.src);
      if (!size) return null;
      const slide = slideBase(footer); vocabularyHeading(slide, item, prompt);
      const credits = picture.credit ? pictureCreditPages(picture.credit) : [];
      const extra = credits.length ? credits[0].height - 0.4 : 0;
      const audioSpace = withAudio ? 0.65 : 0;
      const box = { x: 1.0, y: 2.15, w: 11.3, h: (credits.length ? 3.9 - extra : 4.35) - audioSpace }, scale = Math.min(box.w / size.w, box.h / size.h);
      const w = size.w * scale, h = size.h * scale;
      slide.addImage({ data: picture.src, x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h, altText: picture.alt || '' });
      if (credits.length) addPictureCredit(slide, credits[0], 6.15 - extra - audioSpace, picture.credit);
      for (let index = 1; index < credits.length; index++) {
        const detail = slideBase([...footer, localized('picture_credits', 'Picture credits'), localized('pptx_part', 'Part {n}/{total}', { n: index + 1, total: credits.length })]);
        vocabularyHeading(detail, item, prompt); addPictureCredit(detail, credits[index], 2.15, picture.credit);
      }
      return slide;
    }
    function vocabularyPages(item, clueWord) {
      const sections = [];
      if (item.definition) sections.push({ text: item.definition, language: itemLanguage(item, 'definition'), textScale: meaningScale });
      if (item.example) sections.push({ text: item.example, language: itemLanguage(item, 'example'), label: localized('pptx_example', 'Example: '), textScale: meaningScale });
      if (item.origin) sections.push({ text: item.origin, language: itemLanguage(item, 'origin'), label: localized('pptx_origin', 'Word origin: '), textScale: meaningScale });
      core.visibleTranslations(item, options).forEach(value => {
        const label = core.languageLabel(value.language, context.currentUiLanguage || context.uiLanguage || 'English');
        // A dedicated label line keeps opposite writing directions from
        // joining or moving the separator across the translated passage.
        sections.push({ text: value.text, language: core.languageInfo(value.language), textScale: translationScale, label: value.language ? { ...label, text: (clueWord ? core.maskWord(label.text, clueWord) : label.text) + ':\n', separateLine: true } : null });
      });
      if (!sections.length) {
        // Hidden translations are prepared content, not a missing meaning.
        if (item.translations.length && !core.visibleTranslations(item, options).length) return [];
        const empty = localized('no_meaning', 'No meaning or example has been prepared for this word.');
        sections.push({ text: empty.text, language: empty.language, textScale: meaningScale });
      }
      const pages = []; let page = [], weight = 0;
      sections.forEach(section => vocabularyParts(section).forEach(part => {
        // Larger type gets fewer lines, preserving the 3.5-inch body and margins.
        if (page.length && weight + part.weight > vocabularyBudget + 0.001) { pages.push(page); page = []; weight = 0; }
        page.push(part); weight += part.weight;
      }));
      if (page.length) pages.push(page);
      return pages;
    }
    function addVocabularyPage(slide, paragraphs) {
      const weights = paragraphs.map(part => part.weight);
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      let y = 2.15;
      paragraphs.forEach((part, index) => {
        const h = 3.5 * weights[index] / total;
        const box = { x: 1.0, y, w: 11.3, h, margin: 0.08 };
        const text = (part.label ? part.label.text : '') + part.text;
        const scale = part.textScale || meaningScale;
        const fontSize = fittedFont(text, box, 26 * scale);
        const labelSize = 20 * scale * (fontSize / (26 * scale));
        const value = part.label ? [
          { text: part.label.text, options: { ...textLanguage(part.label.language), rtlMode: (part.label.separateLine ? part.label.language : part.language).dir === 'rtl', ...(part.label.separateLine ? { fontSize: labelSize, bold: semanticBold, color: appearance.muted } : {}) } },
          { text: part.text, options: textLanguage(part.language) }
        ] : part.text;
        slide.addText(value, { ...box, fontFace: appearance.fontFace, ...cardType, fontSize, color: appearance.text, align: part.language.dir === 'rtl' ? 'right' : 'left', valign: 'mid', paraSpaceAfterPt: 0, ...textLanguage(part.language) });
        y += h;
      });
    }
    try {
      for (let index = 0; index < cards.length; index++) {
        checkAbort(context);
        const card = cards[index], item = items.get(card.itemId);
        if (!item) throw new Error(L('pptx_list_changed', 'The word list changed. Start the export again.'));
        const modeNames = { popup: 'Word Fluency Pop-Up', blend: 'Sound & Blend', vocabulary: 'Word Meaning', spelling: 'Listen & Spell', sentence: 'Finish the Sentence' };
        const footer = [localized('card_progress', 'Card {n} of {total}', { n: index + 1, total: cards.length }), localized('mode_' + options.mode, modeNames[options.mode])];
        const answerFooter = () => [...footer, localized('pptx_answer', 'Answer')];
        if (pictureSlidesOnly) {
          const pictureAudio = options.includeAudio && (item.wordAudio || (item.phonemes.length && item.phonemes.every(sound => sound.audio)));
          const picSlide = addPictureSlide(item, footer, null, !!pictureAudio);
          if (picSlide) {
            await addAudio(picSlide, item, footer);
          } else {
            const slide = slideBase(footer);
            mainWord(slide, item.word, card, item, true);
            let overflowRest = '';
            if (item.definition) {
              const defLang = itemLanguage(item, 'definition');
              const defBox = pictureAudio
                ? { x: 1.0, y: 4.75, w: 11.3, h: 1.10, margin: 0.05 }
                : { x: 1.0, y: 4.85, w: 11.3, h: 1.85, margin: 0.05 };
              const defSize = fittedFont(item.definition, defBox, 22 * meaningScale, 12);
              const defWidth = (defBox.w * 72 - defBox.margin * 144) / defSize / fontWidth;
              const defLines = readableTextLines(item.definition, defWidth);
              const maxLines = Math.max(1, Math.floor((defBox.h * 72 - defBox.margin * 144) / (defSize * 1.35)));
              let shownDef = item.definition;
              if (defLines.length > maxLines) {
                const kept = defLines.slice(0, maxLines).join('').trimEnd();
                const segs = sentenceSegments(kept);
                let fit = kept;
                while (segs.length > 1 && readableTextLines(fit + '…', defWidth).length > maxLines) {
                  segs.pop();
                  fit = segs.map(part => part.text).join('').trimEnd();
                }
                shownDef = fit + '…';
                overflowRest = item.definition.slice(fit.length).trimStart();
              }
              slide.addText(shownDef, { ...defBox, fontFace: appearance.fontFace, ...cardType, fontSize: defSize, color: appearance.muted, align: defLang.dir === 'rtl' ? 'right' : 'center', valign: 'top', ...textLanguage(defLang) });
            }
            await addAudio(slide, item, footer);
            if (overflowRest) {
              const restPages = sentenceTextPages(overflowRest);
              for (let page = 0; page < restPages.length; page++) {
                checkAbort(context);
                const detail = slideBase([...footer, localized('pptx_part', 'Part {n}/{total}', { n: page + 2, total: restPages.length + 1 })]);
                addSentenceText(detail, restPages[page], itemLanguage(item, 'definition'), false);
                await sentencePageYield();
              }
            }
          }
        } else if (options.mode === 'sentence') {
          if (!item.sentenceActivity) throw new Error(L('pptx_sentence_missing', 'A prepared sentence activity is missing.'));
          const activity = item.sentenceActivity;
          const choiceText = activity.choices.map((choice, n) => String.fromCharCode(65 + n) + '. ' + choice).join('\n');
          const compact = activity.prompt.length <= 400 && activity.choices.length <= 4 && activity.choices.every(choice => choice.length <= 50)
            && sentenceTextPages(activity.prompt, Math.max(1, Math.floor(4 / textScale)), 22 / textScale / fontWidth).length === 1 && sentenceTextPages(choiceText, Math.max(1, Math.floor(4 / textScale)), 30 / textScale / fontWidth).length === 1;
          let finalPrompt;
          if (compact) {
            const prompt = finalPrompt = slideBase(footer);
            const promptBox = { x: 0.85, y: 1.25, w: 11.65, h: 2.7, margin: 0.1 };
            const choiceBox = { x: 1.4, y: 4.05, w: 10.5, h: 1.65, margin: 0.02 };
            const promptLanguage = itemLanguage(item, 'sentence');
            const wide = /[\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff01-\uff60]/u;
            const promptWidth = Array.from(activity.prompt).reduce((sum, char) => sum + (wide.test(char) ? 2 : 1), 0);
            const prose = /[\r\n]/.test(activity.prompt) || promptWidth > 120;
            prompt.addText(activity.prompt, { ...promptBox, fontFace: appearance.fontFace, ...cardType, fontSize: fittedFont(activity.prompt, promptBox, 34 * textScale), color: appearance.heading, align: prose ? (promptLanguage.dir === 'rtl' ? 'right' : 'left') : 'center', valign: 'mid', ...textLanguage(promptLanguage) });
            prompt.addText(choiceText, { ...choiceBox, fontFace: appearance.fontFace, ...cardType, fontSize: fittedFont(choiceText, choiceBox, 23 * textScale), color: appearance.accent, align: 'center', ...textLanguage(itemLanguage(item, 'term')) });
          } else {
            const prompts = sentenceTextPages(activity.prompt), choices = sentenceChoicePages(activity.choices), total = prompts.length + choices.length;
            for (let page = 0; page < total; page++) {
              checkAbort(context);
              const slide = finalPrompt = slideBase([...footer, localized('pptx_part', 'Part {n}/{total}', { n: page + 1, total })]);
              const isChoicePage = page >= prompts.length;
              addSentenceText(slide, isChoicePage ? choices[page - prompts.length] : prompts[page], itemLanguage(item, isChoicePage ? 'term' : 'sentence'), isChoicePage);
              await sentencePageYield();
            }
          }
          if (typeof finalPrompt.addNotes === 'function') finalPrompt.addNotes(L('pptx_answer_note', 'Answer: {answer}. Advance to reveal.', { answer: activity.answer }));
          checkAbort(context);
          const answerPhaseFooter = answerFooter(); const answer = slideBase(answerPhaseFooter); mainWord(answer, activity.answer, card, item, true); await addAudio(answer, item, answerPhaseFooter);
        } else if (options.mode === 'spelling') {
          const caption = instructionLayout('pptx_spell_advance', 'Advance to check your spelling.', { x: 1, y: 3.8, w: 11.3, h: 0.7, fontSize: 22 * textScale, color: appearance.muted, align: 'center', margin: 0, fit: 'shrink' });
          const prompt = slideBase(instructionFooter(footer, caption));
          uiText(prompt, options.includeAudio && item.wordAudio ? 'spell_listen' : 'spell_teacher', options.includeAudio && item.wordAudio ? 'Listen, then spell the word.' : 'Ask your teacher to say the word, then spell it.', { x: 1, y: 2.0, w: 11.3, h: 1.5, fontSize: 44 * textScale, color: appearance.heading, align: 'center', margin: 0, fit: 'shrink' });
          await addInstruction(prompt, caption, footer);
          if (typeof prompt.addNotes === 'function') prompt.addNotes(L('pptx_say_word_note', 'Say this word aloud if needed: {word}', { word: item.word }));
          await addAudio(prompt, item, footer);
          const answer = slideBase(answerFooter()); mainWord(answer, item.word, card, item, true);
        } else if (options.mode === 'vocabulary') {
          // Meaning first: clue slides under the question, then the word on an answer slide.
          // A picture can prompt recall only when this export can display it.
          const recallItem = options.includePictures && item.picture && !pictureDimensions(item.picture.src) ? { ...item, picture: null } : item;
          const recall = options.vocabularyFirst === 'meaning' && core.hasMeaning(recallItem, options);
          const prompt = recall ? localized('meaning_first_prompt', 'Which word matches this meaning?') : null;
          const displayed = recall ? core.recallClue(item, localized('picture_clue', 'Picture clue').text) : item;
          const pictureAudio = !recall && options.includeAudio && (item.wordAudio || (item.phonemes.length && item.phonemes.every(sound => sound.audio)));
          const pictureSlide = addPictureSlide(displayed, footer, prompt, !!pictureAudio);
          const pictureOnly = recall && pictureSlide && !displayed.definition && !displayed.example && !core.visibleTranslations(displayed, options).length;
          const pages = pictureOnly ? [] : vocabularyPages(displayed, recall ? item.word : '');
          if (pictureSlide && !recall) await addAudio(pictureSlide, item, footer);
          if (!pictureSlide && !pages.length) {
            const wordOnly = slideBase(footer); mainWord(wordOnly, item.word, card, item, true);
            await addAudio(wordOnly, item, footer);
          }
          for (let page = 0; page < pages.length; page++) {
            checkAbort(context);
            const slide = slideBase(pages.length > 1 ? [...footer, localized('pptx_part', 'Part {n}/{total}', { n: page + 1, total: pages.length })] : footer);
            vocabularyHeading(slide, item, prompt);
            addVocabularyPage(slide, pages[page]);
            if (page === 0 && !pictureSlide && !recall) await addAudio(slide, item, footer);
            await sentencePageYield();
          }
          if (recall) {
            checkAbort(context);
            const answerPhaseFooter = answerFooter(); const answer = slideBase(answerPhaseFooter); mainWord(answer, item.word, card, item, true); await addAudio(answer, item, answerPhaseFooter);
            // Restore the original captions, alt text and multilingual passages
            // only after the answer slide. Clue copies never mutate saved data.
            if (pictureSlide) addPictureSlide(item, answerFooter());
            if (item.definition || item.example || item.origin || core.visibleTranslations(item, options).length) {
              const originals = vocabularyPages(item);
              for (let page = 0; page < originals.length; page++) {
                checkAbort(context);
                const footerParts = answerFooter();
                if (originals.length > 1) footerParts.push(localized('pptx_part', 'Part {n}/{total}', { n: page + 1, total: originals.length }));
                const detail = slideBase(footerParts); vocabularyHeading(detail, item); addVocabularyPage(detail, originals[page]);
                await sentencePageYield();
              }
            }
          }
        } else if (options.mode === 'blend' && item.phonemes.length) {
          const caption = instructionLayout('blend_help', 'Say the sounds, then blend the word.', { x: 1, y: 4.8, w: 11.3, h: 0.7, fontSize: 22 * textScale, color: appearance.muted, align: 'center', margin: 0 });
          const prompt = slideBase(instructionFooter(footer, caption));
          const sounds = item.phonemes.map(sound => sound.label).join('  ·  ');
          const box = { x: 0.8, y: 2.0, w: 11.7, h: 2.5, margin: 0.05 };
          prompt.addText(sounds, { ...box, fontFace: appearance.fontFace, ...cardType, fontSize: fittedFont(sounds, box, 60 * textScale), color: appearance.heading, align: 'center', valign: 'mid', ...textLanguage(itemLanguage(item, 'term')) });
          await addInstruction(prompt, caption, footer);
          await addAudio(prompt, item, footer, 'sounds');
          const answerPhaseFooter = answerFooter(); const answer = slideBase(answerPhaseFooter); mainWord(answer, item.word, card, item, true);
          await addAudio(answer, item, answerPhaseFooter, 'word');
        } else {
          const caption = options.mode === 'blend' ? instructionLayout('pptx_no_sounds', 'No sound sequence is prepared for this word.', { x: 0.8, y: 4.85, w: 11.7, h: 0.7, fontSize: 30 * textScale, color: appearance.accent, align: 'center', margin: 0, fit: 'shrink' }) : null;
          const slide = slideBase(caption ? instructionFooter(footer, caption) : footer); mainWord(slide, item.word, card, item, options.mode === 'blend');
          if (caption) await addInstruction(slide, caption, footer);
          await addAudio(slide, item, footer);
        }
        if (!pictureSlidesOnly && options.includePictures && options.pictureSlides === true && options.mode !== 'vocabulary' && item.picture) {
          addPictureSlide(item, footer, null, false);
        }
        await addAnnotationSlides(item, footer);
        if (typeof context.onProgress === 'function') context.onProgress({ completed: index + 1, total: cards.length });
        if ((index + 1) % 10 === 0) { await new Promise(resolve => setTimeout(resolve, 0)); checkAbort(context); }
      }
    } finally { if (audioContext && typeof audioContext.close === 'function') await audioContext.close().catch(() => {}); }
    pptx.wordPracticeWarnings = [...warnings];
    return pptx;
  }
  // The offline HTML player plays sounds with an <audio> element. The sound
  // bank and browser recordings are WebM/Opus, which iPad and older Safari may
  // not play, so the HTML download turns every other format into 16-bit mono
  // 22,050 Hz WAV first (the high frequencies of /s/, /f/, /th/ survive).
  // WAV is about three times larger, so conversion stops before the set's
  // total audio limit; a clip that is left (or cannot be decoded) stays as it
  // was and is counted, never dropped.
  const EVERY_DEVICE_AUDIO = /^data:audio\/(?:wav|x-wav|wave|mpeg|mp3)[;,]/i;
  async function everyDeviceAudio(input, context = {}) {
    const core = getCore(), pack = core.normalizeInput(input);
    const Context = context.AudioContext || root.AudioContext || root.webkitAudioContext;
    const Offline = context.OfflineAudioContext || root.OfflineAudioContext || root.webkitOfflineAudioContext;
    const report = { converted: 0, failed: 0, kept: 0 };
    // Every audio string the pack carries, with how often it appears.
    const uses = new Map();
    let total = 0;
    const count = value => { if (typeof value === 'string' && value) { total += value.length; uses.set(value, (uses.get(value) || 0) + 1); } };
    const voiceAudioUri = ann => ann && ann.kind === 'voice' && ann.mimeType && ann.audioBase64
      ? core.safeAudio('data:' + ann.mimeType + ';base64,' + ann.audioBase64)
      : '';
    pack.items.forEach(item => {
      count(item.wordAudio);
      (item.phonemes || []).forEach(sound => count(sound.audio));
      (item.annotations || []).forEach(ann => count(voiceAudioUri(ann)));
    });
    const budget = Math.floor(core.LIMITS.totalAudioChars * 0.95);
    const replaced = new Map();
    let audioContext = null;
    try {
      for (const [source, times] of uses) {
        checkAbort(context);
        if (EVERY_DEVICE_AUDIO.test(source) || !/^data:audio\//i.test(source)) continue;
        try {
          if (!Context || !Offline) throw new Error('This browser cannot convert audio.');
          if (!audioContext) audioContext = new Context();
          const buffer = await audioContext.decodeAudioData(dataBytes(source).buffer);
          if (!(buffer.duration > 0) || buffer.duration > 60) throw new Error('Unusable clip.');
          // Size known before rendering: base64 of a 44-byte header + 2 bytes a sample.
          const samples = Math.max(1, Math.ceil(buffer.duration * 22050));
          const expected = 'data:audio/wav;base64,'.length + Math.ceil((44 + samples * 2) / 3) * 4;
          if (expected > core.LIMITS.audioChars || total + (expected - source.length) * times > budget) { report.kept++; continue; }
          const offline = new Offline(1, samples, 22050);
          const node = offline.createBufferSource();
          node.buffer = buffer; node.connect(offline.destination); node.start(0);
          const wav = pcmWav([await offline.startRendering()]);
          const grown = (wav.length - source.length) * times;
          if (wav.length > core.LIMITS.audioChars || total + grown > budget) { report.kept++; continue; }
          total += grown;
          replaced.set(source, wav);
          report.converted++;
        } catch (error) {
          if (error && error.name === 'AbortError') throw error;
          report.failed++;
        }
      }
    } finally { if (audioContext && typeof audioContext.close === 'function') await audioContext.close().catch(() => {}); }
    const swap = value => replaced.get(value) || value;
    const swapAnnotation = ann => {
      const uri = voiceAudioUri(ann);
      const next = uri && replaced.get(uri);
      if (!next) return ann;
      const semi = next.indexOf(';'), comma = next.indexOf(',');
      if (semi <= 5 || comma < 0) return ann;
      return { ...ann, mimeType: next.slice(5, semi), audioBase64: next.slice(comma + 1) };
    };
    const items = pack.items.map(item => ({
      ...item,
      wordAudio: swap(item.wordAudio),
      phonemes: (item.phonemes || []).map(sound => ({ ...sound, audio: swap(sound.audio) })),
      ...(Array.isArray(item.annotations) ? { annotations: item.annotations.map(swapAnnotation) } : {})
    }));
    return { pack: { ...pack, items }, ...report };
  }
  // True when a clip would be converted, so a set with only WAV/MP3 (or no
  // sounds) still downloads at once, inside the click.
  function needsEveryDeviceAudio(input) {
    try {
      const core = getCore(), pack = core.normalizeInput(input);
      const convertible = value => typeof value === 'string' && /^data:audio\//i.test(value) && !EVERY_DEVICE_AUDIO.test(value);
      return pack.items.some(item =>
        convertible(item.wordAudio)
        || (item.phonemes || []).some(sound => convertible(sound.audio))
        || (item.annotations || []).some(ann => ann && ann.kind === 'voice' && ann.mimeType && ann.audioBase64 && convertible(core.safeAudio('data:' + ann.mimeType + ';base64,' + ann.audioBase64)))
      );
    } catch (_) { return false; }
  }
  async function buildPictureSlidesPptx(input, rawOptions = {}, context = {}) {
    const core = getCore(), pack = core.normalizeInput(input);
    const opts = core.normalizeOptions({ ...pack.options, ...rawOptions, repetitions: rawOptions.repetitions ?? 1, shuffle: rawOptions.shuffle === true, includePictures: true });
    const sequence = Array.isArray(context.sequence) ? context.sequence : core.createSequence(pack, { ...opts, mode: 'vocabulary' });
    return buildPptx(pack, { ...opts, pictureSlidesOnly: true }, sequence, context);
  }
  function escHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function isSafeStaticSvg(svg) {
    const s = typeof svg === 'string' ? svg : '';
    const stripped = s.replace(/^\s*<\?xml\s[^>]*\?>/i, '').replace(/^(?:\s*<!--[\s\S]*?-->)+/, '').trim();
    if (!/^\s*<svg[\s>]/i.test(stripped) || !/<\/svg>\s*$/i.test(stripped)) return false;
    if (s.length > 300000 || s.indexOf('\\') >= 0 || /<!(?:doctype|entity)/i.test(s) || /<\?(?!xml\s)/i.test(s)) return false;
    const plain = s
      .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16) & 0xFFFF))
      .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(Number(dec) & 0xFFFF))
      .replace(/&(colon|newline|tab);/gi, (_, name) => name.toLowerCase() === 'colon' ? ':' : '');
    const packed = plain.replace(/[\x00-\x20]+/g, '');
    const bare = value => String(value || '').replace(/[\x00-\x20]+/g, '');
    if (/<\s*(?:[^\s<>"'=/:]+:)?(?:script|foreignObject|iframe|embed|object|audio|video|animate\w*|set|handler|listener)\b/i.test(plain)) return false;
    if (/[\s"'\/]on[a-z]+\s*=/i.test(plain) || /(?:java|vb|live)script:/i.test(packed) || /xml:base\s*=/i.test(plain)) return false;
    if (/[\s"'\/]src(?:doc)?\s*=/i.test(plain) || /(?:-(?:webkit|moz)-)?image-set\s*\(/i.test(plain)) return false;
    let m;
    const hrefRe = /(?:[\s"'\/])(?:[^\s<>"'=/:]+:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/gi;
    while ((m = hrefRe.exec(plain))) {
      if (bare(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]).charAt(0) !== '#') return false;
    }
    const styleRe = /<\s*(?:[^\s<>"'=/:]+:)?style\b(?:"[^"]*"|'[^']*'|[^>"'])*>/gi;
    while ((m = styleRe.exec(plain))) {
      if (/\/\s*>$/.test(m[0])) continue;
      const end = plain.slice(styleRe.lastIndex).search(/<\s*\/\s*(?:[^\s<>"'=/:]+:)?style\s*>/i);
      const css = end < 0 ? plain.slice(styleRe.lastIndex) : plain.slice(styleRe.lastIndex, styleRe.lastIndex + end);
      if (end < 0 || /@import|@font-face|@namespace|url\s*\(|(?:-(?:webkit|moz)-)?image-set\s*\(|expression\s*\(/i.test(css)) return false;
    }
    const urlRe = /url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))/gi;
    while ((m = urlRe.exec(plain))) {
      if (bare(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]).charAt(0) !== '#') return false;
    }
    return true;
  }
  function safeHtmlImg(source) {
    const raw = source && typeof source === 'object' ? (source.src || source.dataUri || '') : source;
    const s = String(raw || '').trim();
    // Same https rule as core.safePicture: cards show these, so printables keep them.
    if (/^https:\/\/[^\s"'<>\\]+$/i.test(s) && s.length <= 2048) return s;
    if (!s || !/^data:image\//i.test(s)) return '';
    const core = getCore();
    if (s.length > ((core.LIMITS && core.LIMITS.pictureChars) || (6 * 1024 * 1024))) return '';
    if (!/^data:image\/svg\+xml[;,]/i.test(s)) {
      return core.safePicture(s);
    }
    const comma = s.indexOf(',');
    if (comma < 0) return '';
    const header = s.slice(0, comma);
    const body = s.slice(comma + 1);
    let decoded = '';
    if (/;base64$/i.test(header) || /;base64;/i.test(header)) {
      const cleaned = body.replace(/\s+/g, '');
      if (!cleaned || cleaned.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) return '';
      try { decoded = atob(cleaned); } catch (_) { return ''; }
    } else {
      try { decoded = decodeURIComponent(body); } catch (_) { decoded = body; }
    }
    return isSafeStaticSvg(decoded) ? s : '';
  }
  const RTL_SCRIPT_RE = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}\p{Script=Samaritan}\p{Script=Mandaic}]/u;
  function printableLangInfo(core, langName, sampleText) {
    const info = core && typeof core.languageInfo === 'function' ? core.languageInfo(langName) : { tag: '', dir: 'auto' };
    let tag = info.tag || '', dir = info.dir || 'auto';
    if (dir !== 'rtl' && typeof sampleText === 'string' && sampleText) {
      const firstLetter = sampleText.match(/\p{L}/u)?.[0] || '';
      if (firstLetter && RTL_SCRIPT_RE.test(firstLetter)) {
        dir = 'rtl';
        if (tag && /^en(?:-|$)/i.test(tag)) tag = '';
      }
    }
    return { tag, dir: dir === 'rtl' ? 'rtl' : 'ltr' };
  }
  function langDirAttrs(info) {
    if (!info) return '';
    const tag = info.tag || '', dir = info.dir === 'rtl' ? 'rtl' : 'ltr';
    if ((!tag || tag === 'en') && dir === 'ltr') return '';
    return (tag ? ' lang="' + escHtml(tag) + '"' : '') + ' dir="' + dir + '"';
  }
  function wrapLangSpan(escapedHtml, attrs) {
    return attrs ? '<span' + attrs + '>' + escapedHtml + '</span>' : escapedHtml;
  }
  function formatCreditValue(core, value) {
    if (core && typeof core.formatPictureCredit === 'function') return core.formatPictureCredit(value);
    return typeof value === 'string' ? value.trim() : '';
  }
  function rawPictureLookup(input) {
    const core = getCore();
    const list = Array.isArray(input && input.items) ? input.items : (Array.isArray(input && input.words) ? input.words : []);
    const byId = new Map(), byWord = new Map();
    let totalPictureChars = 0;
    const maxTotalPictureChars = (core.LIMITS && core.LIMITS.totalPictureChars) || (20 * 1024 * 1024);
    list.forEach(entry => {
      if (!entry || typeof entry !== 'object') return;
      const src = safeHtmlImg(entry.image) || safeHtmlImg(entry.picture);
      if (!src) return;
      if (src.startsWith('data:')) {
        if (totalPictureChars + src.length > maxTotalPictureChars) return;
        totalPictureChars += src.length;
      }
      const rawWord = entry.targetWord || entry.word || entry.term || '';
      const decorative = entry.imageDecorative === true || !!(entry.picture && entry.picture.decorative === true);
      const alt = decorative ? '' : ((entry.picture && entry.picture.alt) || entry.imageAlt || rawWord || '');
      const rawCredit = (entry.picture && (entry.picture.credit || entry.picture.attribution))
        || entry.imageCredit || entry.imageAttribution || entry.credit || entry.attribution || '';
      const credit = formatCreditValue(core, rawCredit);
      const info = { src, alt: String(alt || '').trim(), decorative, credit: String(credit || '').trim() };
      if (entry.id) byId.set(String(entry.id), info);
      if (entry.entryId) byId.set('entry:' + String(entry.entryId), info);
      const k = core.key(rawWord);
      if (k && !byWord.has(k)) byWord.set(k, info);
    });
    return { byId, byWord };
  }
  function printableBoxesInfo(item, locale) {
    if (Array.isArray(item && item.phonemes) && item.phonemes.length) {
      const boxes = item.phonemes.map(p => {
        if (typeof p === 'string') return p.trim();
        if (p && typeof p === 'object') return String(p.label || p.grapheme || p.soundKey || p.phoneme || p.sound || p.text || '').trim();
        return '';
      }).filter(Boolean);
      if (boxes.length) return { boxes, isPhonemes: true };
    }
    const word = typeof (item && item.word) === 'string' ? item.word.trim() : '';
    if (!word) return { boxes: [], isPhonemes: false };
    let parts = null;
    try {
      if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
        const seg = new Intl.Segmenter(locale || undefined, { granularity: 'grapheme' });
        parts = Array.from(seg.segment(word), s => s.segment);
      }
    } catch (_) {}
    if (!parts) parts = Array.from(word);
    return { boxes: parts.map(ch => ch.trim()).filter(Boolean), isPhonemes: false };
  }
  function printableBoxes(item, locale) {
    return printableBoxesInfo(item, locale).boxes;
  }
  function blankedSentence(example, word) {
    const ex = String(example || '').trim(), w = String(word || '').trim();
    if (!ex || !w) return ex;
    const core = getCore();
    if (core && typeof core.maskWord === 'function') {
      return core.maskWord(ex, w).replace(/____/g, '_______');
    }
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return ex.replace(new RegExp('(?<![\\p{L}\\p{N}_])' + escaped + '(?![\\p{L}\\p{N}_])', 'giu'), '_______');
  }
  function printableCardsData(input, rawOptions = {}, fallbackTitle = 'Word Cards') {
    const core = getCore(), pack = core.normalizeInput(input);
    const opts = core.normalizeOptions({ ...pack.options, ...rawOptions });
    const rawPics = rawPictureLookup(input);
    const showPics = opts.includePictures !== false;
    const items = (pack.items || []).map(item => {
      const normalizedSrc = safeHtmlImg(item.picture);
      const rawHit = rawPics.byId.get(String(item.id || '')) || rawPics.byWord.get(core.key(item.word));
      const imgSrc = showPics ? (normalizedSrc || (rawHit ? rawHit.src : '')) : '';
      const imgDecorative = !!(item.picture && item.picture.decorative === true) || (!item.picture && !!(rawHit && rawHit.decorative === true));
      const imgAlt = imgDecorative ? '' : ((item.picture && item.picture.alt) || (rawHit && rawHit.alt) || item.word);
      const rawCredit = (item.picture && (item.picture.credit || item.picture.attribution)) || (rawHit && rawHit.credit) || '';
      const imgCredit = formatCreditValue(core, rawCredit);
      const termLangName = typeof core.wordLanguage === 'function' ? core.wordLanguage(item, pack.language) : core.fieldLanguage(item, 'term', pack.language);
      const defLangName = core.fieldLanguage(item, 'definition', pack.language);
      const exLangName = core.fieldLanguage(item, 'example', pack.language);
      const termLang = printableLangInfo(core, termLangName, item.word);
      const defLang = printableLangInfo(core, defLangName, item.definition || '');
      const exLang = printableLangInfo(core, exLangName, item.example || item.contextSentence || '');
      const boxInfo = printableBoxesInfo(item, termLang.tag);
      return {
        word: item.word,
        boxes: boxInfo.boxes,
        boxesArePhonemes: boxInfo.isPhonemes,
        definition: item.definition || '',
        example: item.example || item.contextSentence || '',
        termLang,
        defLang,
        exLang,
        termAttrs: langDirAttrs(termLang),
        defAttrs: langDirAttrs(defLang),
        exAttrs: langDirAttrs(exLang),
        imgSrc,
        imgDecorative,
        imgAlt: String(imgAlt || '').trim(),
        imgCredit: String(imgCredit || '').trim(),
      };
    });
    const title = String((pack && pack.title) || (input && input.title) || fallbackTitle).trim() || fallbackTitle;
    return { title, items };
  }
  function printableCreditsFooter(items) {
    const list = Array.isArray(items) ? items : [];
    if (!list.some(it => it && it.imgSrc)) return '';
    const seen = new Set(), credits = [];
    list.forEach(it => {
      if (!it || !it.imgSrc) return;
      const c = String(it.imgCredit || '').replace(/!/g, '.').trim();
      if (c && !seen.has(c)) { seen.add(c); credits.push(c); }
    });
    const text = credits.length
      ? 'Picture credits: ' + credits.map(escHtml).join('; ') + '.'
      : 'Built-in picture artwork may use Mulberry Symbols or OpenMoji under CC BY-SA 4.0.';
    return '<footer class="credits">' + text + '</footer>';
  }
  const PRINT_BAR_CSS = '.print-bar{display:flex;align-items:center;gap:10px;margin:0 0 12px}.print-btn{font:600 14px/1.2 Arial,Helvetica,sans-serif;padding:7px 14px;border:1px solid #334155;border-radius:6px;background:#0f172a;color:#fff;cursor:pointer}.print-btn:hover{background:#1e293b}';
  const PRINT_BAR_HTML = '<div class="noprint print-bar"><button type="button" class="print-btn" onclick="window.print()">Print</button></div>';
  function buildFlashcardsHtml(input, rawOptions = {}) {
    const data = printableCardsData(input, rawOptions, 'Word Flashcards');
    const creditsHtml = printableCreditsFooter(data.items);
    const rows = data.items.map(it => {
      const boxes = it.boxes.map(b => '<span class="elkonin-box">' + escHtml(b) + '</span>').join('');
      const picHtml = it.imgSrc
        ? '<img class="card-pic" src="' + escHtml(it.imgSrc) + '" alt="' + (it.imgDecorative ? '' : escHtml(it.imgAlt || it.word)) + '"' + (it.imgDecorative ? ' aria-hidden="true"' : '') + '>'
        : '';
      const defHtml = it.definition ? '<p class="def"><strong>Meaning:</strong> ' + wrapLangSpan(escHtml(it.definition), it.defAttrs) + '</p>' : '';
      const blanked = blankedSentence(it.example, it.word);
      const exHtml = blanked ? '<p class="ex"><strong>Sentence:</strong> ' + wrapLangSpan(escHtml(blanked), it.exAttrs) + '</p>' : '';
      return '<article class="fc-row">'
        + '<div class="fc-side fc-front"><div class="side-tag">Front</div><div class="word"' + it.termAttrs + '>' + escHtml(it.word) + '</div><div class="elkonin"' + it.termAttrs + '>' + boxes + '</div></div>'
        + '<div class="fc-side fc-back"><div class="side-tag">Back</div>' + picHtml + '<div class="back-text">' + defHtml + exHtml + '</div></div>'
        + '</article>';
    }).join('\n');
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>' + escHtml(data.title) + ' — 2-Sided Flashcards</title>',
      '<style>',
      'body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:20px;max-width:980px}',
      'h1,h2,h3{break-after:avoid;page-break-after:avoid}',
      'h1{font-size:20px;margin:0 0 6px}',
      '.directions{font-size:13px;color:#334155;margin:0 0 14px}',
      '.fc-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0;border:2px solid #0f172a;margin-bottom:14px;page-break-inside:avoid;break-inside:avoid}',
      '.fc-side{padding:14px;min-height:140px;box-sizing:border-box;min-width:0;overflow-wrap:anywhere}',
      '.fc-front{border-right:2px dashed #475569;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}',
      '.fc-back{display:flex;gap:12px;align-items:center}',
      '.side-tag{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:6px}',
      '.word{font-size:28px;font-weight:800;margin-bottom:10px}',
      '.elkonin{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}',
      '.elkonin-box{border:2px solid #334155;min-width:28px;height:30px;padding:0 6px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;border-radius:4px}',
      '.card-pic{width:76px;height:76px;object-fit:contain;border:1px solid #cbd5e1;border-radius:6px;background:#fff;flex-shrink:0}',
      '.back-text{min-width:0;flex:1}',
      '.back-text p{margin:0 0 6px;font-size:14px;line-height:1.4}',
      '.credits{margin-top:16px;padding-top:8px;border-top:1px solid #cbd5e1;font-size:11px;color:#475569;line-height:1.4}',
      PRINT_BAR_CSS,
      '@media print{@page{margin:12mm} body{margin:0;max-width:none} .noprint{display:none}}',
      '</style>',
      '</head>',
      '<body>',
      PRINT_BAR_HTML,
      '<h1>' + escHtml(data.title) + ' — Cut-and-Fold Flashcards</h1>',
      '<p class="directions">Cut across each card row, fold along the dashed line, and tape or glue the front and back together.</p>',
      rows,
      creditsHtml,
      '</body>',
      '</html>',
    ].join('\n');
  }
  function buildFrayerHtml(input, rawOptions = {}) {
    const data = printableCardsData(input, rawOptions, 'Frayer Study Sheets');
    const creditsHtml = printableCreditsFooter(data.items);
    const cards = data.items.map(it => {
      const boxes = it.boxes.map(b => '<span class="elkonin-box">' + escHtml(b) + '</span>').join('');
      const picBlock = it.imgSrc
        ? '<img class="card-pic" src="' + escHtml(it.imgSrc) + '" alt="' + (it.imgDecorative ? '' : escHtml(it.imgAlt || it.word)) + '"' + (it.imgDecorative ? ' aria-hidden="true"' : '') + '>'
        : '<div class="sketch-space">Draw a quick sketch here</div>';
      return '<section class="frayer-card">'
        + '<header class="frayer-head"><h2 class="frayer-word"' + it.termAttrs + '>' + escHtml(it.word) + '</h2><div class="elkonin"' + it.termAttrs + '>' + boxes + '</div></header>'
        + '<div class="frayer-grid">'
        + '<div class="frayer-box"><h3>Meaning</h3><p' + (it.definition ? it.defAttrs : '') + '>' + escHtml(it.definition || 'Write a meaning in your own words.') + '</p></div>'
        + '<div class="frayer-box"><h3>Picture or sketch</h3>' + picBlock + '</div>'
        + '<div class="frayer-box"><h3>Example sentence</h3><p' + (it.example ? it.exAttrs : '') + '>' + escHtml(it.example || '') + '</p></div>'
        + '<div class="frayer-box"><h3>Write your own sentence</h3><div class="write-lines"><div></div><div></div></div></div>'
        + '</div></section>';
    }).join('\n');
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>' + escHtml(data.title) + ' — Frayer Study Sheets</title>',
      '<style>',
      'body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:20px;max-width:960px}',
      'h1,h2,h3{break-after:avoid;page-break-after:avoid}',
      'h1{font-size:20px;margin:0 0 12px}',
      '.frayer-card{border:2px solid #0f172a;border-radius:8px;padding:12px;margin-bottom:18px;page-break-inside:avoid;break-inside:avoid}',
      '.frayer-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:10px}',
      '.frayer-word{margin:0;font-size:24px;font-weight:800;overflow-wrap:anywhere}',
      '.elkonin{display:flex;flex-wrap:wrap;gap:6px}',
      '.elkonin-box{border:2px solid #334155;min-width:26px;height:28px;padding:0 5px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;border-radius:4px}',
      '.frayer-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}',
      '.frayer-box{border:1px solid #475569;border-radius:6px;padding:10px;min-height:96px;min-width:0;overflow-wrap:anywhere}',
      '.frayer-box h3{margin:0 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#334155}',
      '.frayer-box p{margin:0;font-size:14px;line-height:1.4}',
      '.card-pic{max-width:86px;max-height:86px;object-fit:contain;display:block}',
      '.sketch-space{height:64px;border:1px dashed #94a3b8;border-radius:4px;display:grid;place-items:center;font-size:12px;color:#64748b}',
      '.write-lines div{border-bottom:1px solid #94a3b8;height:26px}',
      '.credits{margin-top:16px;padding-top:8px;border-top:1px solid #cbd5e1;font-size:11px;color:#475569;line-height:1.4}',
      PRINT_BAR_CSS,
      '@media print{@page{margin:12mm} body{margin:0;max-width:none} .noprint{display:none} .frayer-card{page-break-inside:avoid;break-inside:avoid}}',
      '</style>',
      '</head>',
      '<body>',
      PRINT_BAR_HTML,
      '<h1>' + escHtml(data.title) + ' — Frayer Study Sheets</h1>',
      cards,
      creditsHtml,
      '</body>',
      '</html>',
    ].join('\n');
  }
  function sortingOrder(count, salt) {
    const out = [];
    for (let i = 0; i < count; i++) out.push(i);
    if (count < 2) return out;
    let seed = (salt >>> 0) || 1;
    for (let i = count - 1; i > 0; i--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const j = seed % (i + 1);
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    if (out[0] === 0 && count > 1) {
      const swap = out[0];
      out[0] = out[1];
      out[1] = swap;
    }
    return out;
  }
  function buildSortingCardsHtml(input, rawOptions = {}) {
    const data = printableCardsData(input, rawOptions, 'Word Sorting Cards');
    const items = data.items || [];
    const wordTiles = items.map(it => {
      const boxes = it.boxes.map(b => '<span class="elkonin-box">' + escHtml(b) + '</span>').join('');
      return '<article class="sort-tile sort-word">'
        + '<div class="tile-tag">Word</div>'
        + '<div class="sort-word-text"' + it.termAttrs + '>' + escHtml(it.word) + '</div>'
        + '<div class="elkonin"' + it.termAttrs + '>' + boxes + '</div>'
        + '</article>';
    }).join('\n');
    const meaningOrder = sortingOrder(items.length, 37);
    const meaningTiles = meaningOrder.map(idx => {
      const it = items[idx];
      const defBlank = blankedSentence(it.definition, it.word);
      const exBlank = blankedSentence(it.example, it.word);
      const countUnit = it.boxesArePhonemes
        ? (it.boxes.length === 1 ? 'sound' : 'sounds')
        : (it.boxes.length === 1 ? 'letter' : 'letters');
      const defHtml = defBlank
        ? '<p class="sort-def"><strong>Meaning:</strong> ' + wrapLangSpan(escHtml(defBlank), it.defAttrs) + '</p>'
        : '<p class="sort-def"><strong>Word clue:</strong> ' + escHtml(it.boxes.length + ' ' + countUnit) + '</p>';
      const exHtml = exBlank ? '<p class="sort-ex"><strong>Sentence:</strong> ' + wrapLangSpan(escHtml(exBlank), it.exAttrs) + '</p>' : '';
      return '<article class="sort-tile sort-meaning">'
        + '<div class="tile-tag">Meaning</div>'
        + defHtml
        + exHtml
        + '</article>';
    }).join('\n');
    const picEntries = [];
    sortingOrder(items.length, 91).forEach(idx => {
      const it = items[idx];
      if (!it.imgSrc) return;
      picEntries.push('<article class="sort-tile sort-picture">'
        + '<div class="tile-tag">Picture</div>'
        + '<img class="sort-pic" src="' + escHtml(it.imgSrc) + '" alt="' + (it.imgDecorative ? '' : 'Sorting picture card') + '"' + (it.imgDecorative ? ' aria-hidden="true"' : '') + '>'
        + '</article>');
    });
    const pictureSection = picEntries.length
      ? '<section class="sort-group"><h2>Picture cards (unlabeled)</h2><div class="sort-grid sort-grid-pics">' + picEntries.join('\n') + '</div></section>'
      : '';
    const keyRows = items.map((it, idx) => {
      const picInfo = it.imgSrc
        ? ('Yes' + (it.imgCredit ? ' (' + escHtml(it.imgCredit) + ')' : ''))
        : 'None attached';
      return '<tr>'
        + '<td>' + (idx + 1) + '</td>'
        + '<td><strong' + it.termAttrs + '>' + escHtml(it.word) + '</strong></td>'
        + '<td>' + wrapLangSpan(escHtml(it.definition || ''), it.defAttrs) + (it.example ? '<br><em' + it.exAttrs + '>' + escHtml(it.example) + '</em>' : '') + '</td>'
        + '<td>' + picInfo + '</td>'
        + '</tr>';
    }).join('\n');
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>' + escHtml(data.title) + ' — Cut-Out Sorting Cards</title>',
      '<style>',
      'body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:20px;max-width:980px}',
      'h1,h2,h3{break-after:avoid;page-break-after:avoid}',
      'h1{font-size:20px;margin:0 0 6px}',
      'h2{font-size:15px;margin:14px 0 8px;color:#1e293b}',
      '.directions{font-size:13px;color:#334155;margin:0 0 12px}',
      '.sort-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}',
      '.sort-tile{border:2px dashed #334155;border-radius:8px;padding:12px;min-height:92px;box-sizing:border-box;background:#fff;page-break-inside:avoid;break-inside:avoid;overflow-wrap:anywhere}',
      '.tile-tag{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:6px}',
      '.sort-word{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}',
      '.sort-word-text{font-size:24px;font-weight:800;margin-bottom:8px}',
      '.elkonin{display:flex;flex-wrap:wrap;gap:5px;justify-content:center}',
      '.elkonin-box{border:2px solid #334155;min-width:24px;height:26px;padding:0 5px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border-radius:4px}',
      '.sort-meaning p{margin:0 0 6px;font-size:13px;line-height:1.4}',
      '.sort-picture{display:flex;flex-direction:column;align-items:center;justify-content:center}',
      '.sort-pic{width:92px;height:92px;object-fit:contain;display:block}',
      '.teacher-key{margin-top:24px;padding-top:14px;border-top:2px solid #0f172a;page-break-before:always;break-before:page}',
      '.key-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}',
      '.key-table tr{page-break-inside:avoid;break-inside:avoid}',
      '.key-table th,.key-table td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;vertical-align:top}',
      '.key-table th{background:#f1f5f9}',
      '.attr-note{font-size:12px;color:#475569;margin-top:10px}',
      PRINT_BAR_CSS,
      '@media print{@page{margin:12mm} body{margin:0;max-width:none} .noprint{display:none} .sort-tile{page-break-inside:avoid;break-inside:avoid} .teacher-key{page-break-before:always;break-before:page}}',
      '</style>',
      '</head>',
      '<body>',
      PRINT_BAR_HTML,
      '<h1>' + escHtml(data.title) + ' — Cut-Out Sorting Cards</h1>',
      '<p class="directions">Cut along the dashed lines and mix the piles. Match each word card with its meaning card' + (picEntries.length ? ' and picture card' : '') + '.</p>',
      '<section class="sort-group"><h2>Word cards</h2><div class="sort-grid">' + wordTiles + '</div></section>',
      '<section class="sort-group"><h2>Meaning cards (target word blanked)</h2><div class="sort-grid">' + meaningTiles + '</div></section>',
      pictureSection,
      '<section class="teacher-key">',
      '<h2>Teacher Answer &amp; Attribution Key</h2>',
      '<table class="key-table"><thead><tr><th>#</th><th>Word</th><th>Meaning &amp; Example</th><th>Picture</th></tr></thead><tbody>',
      keyRows,
      '</tbody></table>',
      '<p class="attr-note">Built-in picture artwork may use Mulberry Symbols or OpenMoji under CC BY-SA 4.0 unless a custom credit is shown above.</p>',
      '</section>',
      '</body>',
      '</html>',
    ].join('\n');
  }
  function buildWorksheetHtml(input, rawOptions = {}) {
    const data = printableCardsData(input, rawOptions, 'Vocabulary Study Worksheet');
    const items = data.items || [];
    const bankOrder = sortingOrder(items.length, 53);
    const bankChips = bankOrder.map(idx => {
      const it = items[idx];
      const boxes = it.boxes.map(b => '<span class="elkonin-box">' + escHtml(b) + '</span>').join('');
      return '<span class="bank-chip"><span class="bank-word"' + it.termAttrs + '>' + escHtml(it.word) + '</span>' + (boxes ? '<span class="elkonin"' + it.termAttrs + '>' + boxes + '</span>' : '') + '</span>';
    }).join('\n');
    const matchOrder = sortingOrder(items.length, 79);
    const matchRows = matchOrder.map((idx, pos) => {
      const it = items[idx];
      const defBlank = blankedSentence(it.definition, it.word);
      const picHtml = it.imgSrc
        ? '<img class="ws-pic" src="' + escHtml(it.imgSrc) + '" alt="' + (it.imgDecorative ? '' : 'Worksheet clue picture') + '"' + (it.imgDecorative ? ' aria-hidden="true"' : '') + '>'
        : '';
      return '<li class="ws-match-item">'
        + '<span class="ws-num">' + (pos + 1) + '.</span>'
        + '<span class="ws-blank">______________</span>'
        + '<span class="ws-def"' + (defBlank ? it.defAttrs : '') + '>' + escHtml(defBlank || ('Matches sound pattern: ' + it.boxes.join(' / '))) + '</span>'
        + picHtml
        + '</li>';
    }).join('\n');
    const clozeOrder = sortingOrder(items.length, 107);
    const clozeRows = clozeOrder.map((idx, pos) => {
      const it = items[idx];
      const exBlank = blankedSentence(it.example, it.word);
      const lineText = exBlank
        ? escHtml(exBlank)
        : 'Write a sentence using one word from the Word Bank: ______________________________';
      return '<li class="ws-cloze-item"><span class="ws-num">' + (pos + 1) + '.</span><span' + (exBlank ? it.exAttrs : '') + '>' + lineText + '</span></li>';
    }).join('\n');
    const matchKeyRows = matchOrder.map((idx, pos) => {
      const it = items[idx];
      return '<tr><td>' + (pos + 1) + '</td><td><strong' + it.termAttrs + '>' + escHtml(it.word) + '</strong></td><td>' + wrapLangSpan(escHtml(it.definition || ''), it.defAttrs) + '</td><td>' + (it.imgSrc ? (it.imgCredit ? escHtml(it.imgCredit) : 'Included') : 'None') + '</td></tr>';
    }).join('\n');
    const clozeKeyRows = clozeOrder.map(idx => {
      const it = items[idx];
      return '<li><strong' + it.termAttrs + '>' + escHtml(it.word) + '</strong>' + (it.example ? ' — ' + wrapLangSpan(escHtml(it.example), it.exAttrs) : ' — (Student sentence)') + '</li>';
    }).join('\n');
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>' + escHtml(data.title) + ' — Cloze and Matching Worksheet</title>',
      '<style>',
      'body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:20px;max-width:960px}',
      'h1,h2,h3{break-after:avoid;page-break-after:avoid}',
      'h1{font-size:20px;margin:0 0 8px}',
      'h2{font-size:15px;margin:16px 0 8px;color:#1e293b}',
      '.ws-meta{display:flex;flex-wrap:wrap;gap:20px;font-size:14px;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:12px}',
      '.ws-word-bank{border:2px solid #334155;border-radius:8px;padding:10px 12px;background:#f8fafc;margin-bottom:14px}',
      '.bank-list{display:flex;flex-wrap:wrap;gap:8px}',
      '.bank-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid #475569;border-radius:6px;padding:4px 8px;background:#fff}',
      '.bank-word{font-weight:700;font-size:15px}',
      '.elkonin{display:inline-flex;gap:3px}',
      '.elkonin-box{border:1px solid #64748b;min-width:16px;height:18px;padding:0 3px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border-radius:3px}',
      '.ws-matching ol,.ws-cloze ol{margin:0;padding-left:0;list-style:none}',
      '.ws-match-item,.ws-cloze-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;line-height:1.45;page-break-inside:avoid;break-inside:avoid}',
      '.ws-num{font-weight:700;min-width:22px}',
      '.ws-blank{font-weight:700;color:#334155;white-space:nowrap}',
      '.ws-def{flex:1}',
      '.ws-pic{width:54px;height:54px;object-fit:contain;border:1px solid #cbd5e1;border-radius:4px;background:#fff;flex-shrink:0}',
      '.teacher-key{margin-top:24px;padding-top:14px;border-top:2px solid #0f172a;page-break-before:always;break-before:page}',
      '.key-table{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0 12px}',
      '.key-table tr{page-break-inside:avoid;break-inside:avoid}',
      '.key-table th,.key-table td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;vertical-align:top}',
      '.key-table th{background:#f1f5f9}',
      '.key-cloze{margin:6px 0 0 18px;font-size:13px;line-height:1.5}',
      '.attr-note{font-size:12px;color:#475569;margin-top:10px}',
      PRINT_BAR_CSS,
      '@media print{@page{margin:12mm} body{margin:0;max-width:none} .noprint{display:none} .ws-match-item,.ws-cloze-item{page-break-inside:avoid;break-inside:avoid} .teacher-key{page-break-before:always;break-before:page}}',
      '</style>',
      '</head>',
      '<body>',
      PRINT_BAR_HTML,
      '<h1>' + escHtml(data.title) + ' — Cloze and Matching Worksheet</h1>',
      '<div class="ws-meta"><span>Name: ______________________________</span><span>Date: ________________</span></div>',
      '<section class="ws-word-bank"><h2>Word Bank</h2><div class="bank-list">' + bankChips + '</div></section>',
      '<section class="ws-matching"><h2>Part 1 — Match Each Meaning and Picture</h2><ol>' + matchRows + '</ol></section>',
      '<section class="ws-cloze"><h2>Part 2 — Fill in the Blank Sentences</h2><ol>' + clozeRows + '</ol></section>',
      '<section class="teacher-key">',
      '<h2>Teacher Answer &amp; Attribution Key</h2>',
      '<table class="key-table"><thead><tr><th>#</th><th>Word</th><th>Meaning</th><th>Picture</th></tr></thead><tbody>' + matchKeyRows + '</tbody></table>',
      '<h3>Part 2 Answers</h3>',
      '<ol class="key-cloze">' + clozeKeyRows + '</ol>',
      '<p class="attr-note">Built-in picture artwork may use Mulberry Symbols or OpenMoji under CC BY-SA 4.0 unless a custom credit is shown above.</p>',
      '</section>',
      '</body>',
      '</html>',
    ].join('\n');
  }
  function buildBingoHtml(input, rawOptions = {}) {
    const data = printableCardsData(input, rawOptions, 'Vocabulary Classroom Bingo');
    const items = data.items || [];
    const boardCount = 6;
    const gridSize = items.length >= 16 ? 4 : 3;
    const cellCount = gridSize * gridSize;
    const hasFree = gridSize === 3;
    const needed = hasFree ? cellCount - 1 : cellCount;
    const boardsHtml = [];
    for (let b = 0; b < boardCount; b++) {
      const pool = [];
      if (items.length > 0) {
        let pass = 0;
        while (pool.length < needed) {
          sortingOrder(items.length, 37 + b * 97 + pass * 131).forEach(idx => pool.push(items[idx]));
          pass++;
        }
      }
      let poolCursor = 0;
      const rows = [];
      for (let r = 0; r < gridSize; r++) {
        const cells = [];
        for (let c = 0; c < gridSize; c++) {
          const pos = r * gridSize + c;
          if (hasFree && pos === 4) {
            cells.push('<td class="bingo-cell bingo-free"><div class="bingo-word">FREE</div><div class="bingo-sub">Center space</div></td>');
            continue;
          }
          const it = pool[poolCursor++];
          if (!it) {
            cells.push('<td class="bingo-cell"><div class="bingo-word">____</div></td>');
            continue;
          }
          const picHtml = it.imgSrc
            ? '<img class="bingo-pic" src="' + escHtml(it.imgSrc) + '" alt="' + (it.imgDecorative ? '' : 'Bingo picture cue') + '"' + (it.imgDecorative ? ' aria-hidden="true"' : '') + '>'
            : '';
          cells.push('<td class="bingo-cell"><div class="bingo-word"' + it.termAttrs + '>' + escHtml(it.word) + '</div>' + picHtml + '</td>');
        }
        rows.push('<tr>' + cells.join('') + '</tr>');
      }
      boardsHtml.push(
        '<section class="bingo-board" data-board="' + (b + 1) + '">'
        + '<h2>' + escHtml(data.title) + ' — Board ' + (b + 1) + '</h2>'
        + '<table class="bingo-grid" data-grid-size="' + gridSize + '"><tbody>' + rows.join('') + '</tbody></table>'
        + '</section>'
      );
    }
    const callerOrder = sortingOrder(items.length, 211);
    const callerRows = callerOrder.map((idx, pos) => {
      const it = items[idx];
      const defBlank = blankedSentence(it.definition, it.word);
      const exBlank = blankedSentence(it.example, it.word);
      const parts = [];
      if (defBlank) parts.push(wrapLangSpan(escHtml(defBlank), it.defAttrs));
      if (exBlank) parts.push('<em' + it.exAttrs + '>' + escHtml(exBlank) + '</em>');
      if (!parts.length) parts.push('Sound pattern: ' + escHtml(it.boxes.join(' / ')));
      const picInfo = it.imgSrc
        ? ('Yes' + (it.imgCredit ? ' (' + escHtml(it.imgCredit) + ')' : ''))
        : 'None';
      return '<tr><td>' + (pos + 1) + '</td><td><strong' + it.termAttrs + '>' + escHtml(it.word) + '</strong></td><td>' + parts.join('<br>') + '</td><td>' + picInfo + '</td></tr>';
    }).join('\n');
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>' + escHtml(data.title) + ' — Classroom Bingo Boards</title>',
      '<style>',
      'body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:20px;max-width:1020px}',
      'h1,h2,h3{break-after:avoid;page-break-after:avoid}',
      'h1{font-size:20px;margin:0 0 6px}',
      'h2{font-size:15px;margin:0 0 8px;color:#1e293b}',
      '.directions{font-size:13px;color:#334155;margin:0 0 14px}',
      '.bingo-boards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}',
      '.bingo-board{border:2px solid #0f172a;border-radius:8px;padding:10px;background:#fff;page-break-inside:avoid;break-inside:avoid}',
      '.bingo-grid{width:100%;border-collapse:collapse;table-layout:fixed}',
      '.bingo-cell{border:2px solid #334155;height:86px;padding:6px;text-align:center;vertical-align:middle}',
      '.bingo-free{background:#f1f5f9}',
      '.bingo-word{font-size:15px;font-weight:800;line-height:1.2;word-break:break-word}',
      '.bingo-sub{font-size:11px;color:#475569;margin-top:3px}',
      '.bingo-pic{width:38px;height:38px;object-fit:contain;display:block;margin:4px auto 0}',
      '.teacher-key{margin-top:24px;padding-top:14px;border-top:2px solid #0f172a;page-break-before:always;break-before:page}',
      '.key-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}',
      '.key-table tr{page-break-inside:avoid;break-inside:avoid}',
      '.key-table th,.key-table td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;vertical-align:top}',
      '.key-table th{background:#f1f5f9}',
      '.attr-note{font-size:12px;color:#475569;margin-top:10px}',
      PRINT_BAR_CSS,
      '@media print{@page{margin:12mm} body{margin:0;max-width:none} .noprint{display:none} .bingo-boards{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px} .bingo-board{page-break-inside:avoid;break-inside:avoid} .teacher-key{page-break-before:always;break-before:page}}',
      '</style>',
      '</head>',
      '<body>',
      PRINT_BAR_HTML,
      '<h1>' + escHtml(data.title) + ' — Classroom Bingo Boards</h1>',
      '<p class="directions">Print one board per student or pair. Call the meaning or fill-in-the-blank clue from the Teacher Caller Sheet on the last page.</p>',
      '<div class="bingo-boards">' + boardsHtml.join('\n') + '</div>',
      '<section class="teacher-key">',
      '<h2>Teacher Caller Clues &amp; Attribution Key</h2>',
      '<p class="directions">Read the meaning or fill-in-the-blank clue aloud without saying the target word. Check the caller row as you go.</p>',
      '<table class="key-table"><thead><tr><th>Call #</th><th>Target Word</th><th>Caller Clue (target word blanked)</th><th>Picture</th></tr></thead><tbody>' + callerRows + '</tbody></table>',
      '<p class="attr-note">Built-in picture artwork may use Mulberry Symbols or OpenMoji under CC BY-SA 4.0 unless a custom credit is shown above.</p>',
      '</section>',
      '</body>',
      '</html>',
    ].join('\n');
  }
  function buildLoopGameHtml(input, rawOptions = {}) {
    const data = printableCardsData(input, rawOptions, 'I Have, Who Has Loop Cards');
    const items = data.items || [];
    const order = sortingOrder(items.length, 313);
    const chain = order.map(idx => items[idx]);
    const cardsHtml = chain.length >= 2
      ? chain.map((cur, i) => {
          const next = chain[(i + 1) % chain.length];
          const boxes = cur.boxes.map(b => '<span class="elkonin-box">' + escHtml(b) + '</span>').join('');
          const picHtml = cur.imgSrc
            ? '<img class="loop-pic" src="' + escHtml(cur.imgSrc) + '" alt="' + (cur.imgDecorative ? '' : 'I have picture cue') + '"' + (cur.imgDecorative ? ' aria-hidden="true"' : '') + '>'
            : '';
          const nextDef = blankedSentence(next.definition, next.word);
          const nextEx = blankedSentence(next.example, next.word);
          const whoClue = nextDef || nextEx || ('the word with sound boxes: ' + next.boxes.join(' / '));
          const whoAttrs = nextDef ? next.defAttrs : nextEx ? next.exAttrs : '';
          const roleTag = i === 0
            ? 'Card 1 — Start Card'
            : (i === chain.length - 1 ? ('Card ' + (i + 1) + ' — Loops to Card 1') : ('Card ' + (i + 1)));
          return '<article class="loop-card" data-step="' + (i + 1) + '">'
            + '<div class="loop-tag">' + escHtml(roleTag) + '</div>'
            + '<div class="loop-have"><div class="loop-label">I have</div><div class="loop-word"' + cur.termAttrs + '>' + escHtml(cur.word) + '</div>'
            + (boxes ? '<div class="elkonin"' + cur.termAttrs + '>' + boxes + '</div>' : '')
            + picHtml + '</div>'
            + '<div class="loop-who"><div class="loop-label">Who has...</div><p class="loop-clue"' + whoAttrs + '>' + escHtml(whoClue) + '</p></div>'
            + '</article>';
        }).join('\n')
      : '<article class="loop-card"><div class="loop-have"><div class="loop-label">Add words</div><p class="loop-clue">Add at least two words before printing loop cards.</p></div></article>';
    const keyRows = chain.length >= 2 ? chain.map((cur, i) => {
      const next = chain[(i + 1) % chain.length];
      const nextDef = blankedSentence(next.definition, next.word);
      const nextEx = blankedSentence(next.example, next.word);
      const whoClue = nextDef || nextEx || ('Sound boxes: ' + next.boxes.join(' / '));
      const whoAttrs = nextDef ? next.defAttrs : nextEx ? next.exAttrs : '';
      const picInfo = cur.imgSrc
        ? ('Yes' + (cur.imgCredit ? ' (' + escHtml(cur.imgCredit) + ')' : ''))
        : 'None';
      return '<tr><td>' + (i + 1) + '</td><td><strong' + cur.termAttrs + '>' + escHtml(cur.word) + '</strong></td><td>' + wrapLangSpan(escHtml(whoClue), whoAttrs) + '</td><td><strong' + next.termAttrs + '>' + escHtml(next.word) + '</strong></td><td>' + picInfo + '</td></tr>';
    }).join('\n') : '';
    const keySection = keyRows ? [
      '<section class="teacher-key">',
      '<h2>Teacher Chain Sequence &amp; Attribution Key</h2>',
      '<table class="key-table"><thead><tr><th>Step #</th><th>Student Says "I have..."</th><th>Student Reads "Who has..." Clue</th><th>Next Card Answer</th><th>Picture</th></tr></thead><tbody>' + keyRows + '</tbody></table>',
      '<p class="attr-note">Built-in picture artwork may use Mulberry Symbols or OpenMoji under CC BY-SA 4.0 unless a custom credit is shown above.</p>',
      '</section>',
    ].join('\n') : '';
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>' + escHtml(data.title) + ' — I Have, Who Has Cards</title>',
      '<style>',
      'body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:20px;max-width:980px}',
      'h1,h2,h3{break-after:avoid;page-break-after:avoid}',
      'h1{font-size:20px;margin:0 0 6px}',
      'h2{font-size:15px;margin:0 0 8px;color:#1e293b}',
      '.directions{font-size:13px;color:#334155;margin:0 0 14px}',
      '.loop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}',
      '.loop-card{border:2px dashed #334155;border-radius:10px;padding:12px;background:#fff;display:flex;flex-direction:column;justify-content:space-between;min-height:190px;page-break-inside:avoid;break-inside:avoid;overflow-wrap:anywhere}',
      '.loop-tag{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#475569;margin-bottom:6px}',
      '.loop-have{border-bottom:2px solid #cbd5e1;padding-bottom:10px;margin-bottom:10px;text-align:center}',
      '.loop-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#334155;margin-bottom:4px}',
      '.loop-word{font-size:24px;font-weight:800;margin-bottom:6px}',
      '.elkonin{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-bottom:6px}',
      '.elkonin-box{border:1px solid #334155;min-width:20px;height:22px;padding:0 4px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border-radius:4px}',
      '.loop-pic{width:54px;height:54px;object-fit:contain;display:block;margin:4px auto 0}',
      '.loop-who{text-align:left}',
      '.loop-clue{margin:0;font-size:13px;line-height:1.4}',
      '.teacher-key{margin-top:24px;padding-top:14px;border-top:2px solid #0f172a;page-break-before:always;break-before:page}',
      '.key-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}',
      '.key-table tr{page-break-inside:avoid;break-inside:avoid}',
      '.key-table th,.key-table td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;vertical-align:top}',
      '.key-table th{background:#f1f5f9}',
      '.attr-note{font-size:12px;color:#475569;margin-top:10px}',
      PRINT_BAR_CSS,
      '@media print{@page{margin:12mm} body{margin:0;max-width:none} .noprint{display:none} .loop-card{page-break-inside:avoid;break-inside:avoid} .teacher-key{page-break-before:always;break-before:page}}',
      '</style>',
      '</head>',
      '<body>',
      PRINT_BAR_HTML,
      '<h1>' + escHtml(data.title) + ' — I Have, Who Has Cards</h1>',
      '<p class="directions">Cut along the dashed borders and deal one or more cards to each student. Card 1 reads "Who has..." to start the closed chain back to Card 1.</p>',
      '<div class="loop-grid">' + cardsHtml + '</div>',
      keySection,
      '</body>',
      '</html>',
    ].join('\n');
  }
  function buildWordWallHtml(input, rawOptions = {}) {
    const data = printableCardsData(input, rawOptions, 'Classroom Word Wall Cards');
    const items = data.items || [];
    const cleanBang = s => escHtml(String(s == null ? '' : s).replace(/!/g, '.'));
    const rawDecoMap = new Map();
    const rawList = Array.isArray(input && input.items) ? input.items : (Array.isArray(input && input.words) ? input.words : []);
    rawList.forEach(entry => {
      if (!entry || typeof entry !== 'object') return;
      const wKey = getCore().key(entry.targetWord || entry.word || entry.term || '');
      const deco = !!(entry.imageDecorative || (entry.picture && entry.picture.decorative));
      if (wKey && deco) rawDecoMap.set(wKey, true);
    });
    const wallCardsHtml = items.length
      ? items.map((it, idx) => {
          const boxes = it.boxes.map(b => '<span class="elkonin-box">' + cleanBang(b) + '</span>').join('');
          const isDeco = it.imgDecorative || rawDecoMap.has(getCore().key(it.word));
          const picAlt = isDeco ? '' : cleanBang(it.imgAlt || it.word);
          const picHtml = it.imgSrc
            ? '<img class="wall-pic" src="' + escHtml(it.imgSrc) + '" alt="' + picAlt + '"' + (isDeco ? ' aria-hidden="true"' : '') + '>'
            : '';
          const defText = it.definition || 'Meaning to discuss in class.';
          const exHtml = it.example ? '<p class="wall-ex"><em' + it.exAttrs + '>' + cleanBang(it.example) + '</em></p>' : '';
          return '<article class="wall-card" data-card="' + (idx + 1) + '">'
            + '<div class="wall-top"><div class="wall-word"' + it.termAttrs + '>' + cleanBang(it.word) + '</div>'
            + (boxes ? '<div class="elkonin"' + it.termAttrs + '>' + boxes + '</div>' : '') + '</div>'
            + '<div class="wall-body">' + picHtml
            + '<div class="wall-text"><p class="wall-def"' + (it.definition ? it.defAttrs : '') + '>' + cleanBang(defText) + '</p>' + exHtml + '</div></div>'
            + '</article>';
        }).join('\n')
      : '<article class="wall-card"><div class="wall-top"><div class="wall-word">Add words</div></div><div class="wall-body"><div class="wall-text"><p class="wall-def">Add words before printing classroom Word Wall cards.</p></div></div></article>';
    const keyRows = items.map((it, idx) => {
      const picInfo = it.imgSrc
        ? ('Yes' + (it.imgCredit ? ' (' + cleanBang(it.imgCredit) + ')' : ''))
        : 'None';
      return '<tr><td>' + (idx + 1) + '</td><td><strong' + it.termAttrs + '>' + cleanBang(it.word) + '</strong></td><td>' + wrapLangSpan(cleanBang(it.boxes.join(' / ')), it.termAttrs) + '</td><td>' + wrapLangSpan(cleanBang(it.definition || ''), it.defAttrs) + '</td><td>' + picInfo + '</td></tr>';
    }).join('\n');
    const titleSafe = cleanBang(data.title);
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>' + titleSafe + ' — Classroom Word Wall Cards</title>',
      '<style>',
      'body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:20px;max-width:980px}',
      'h1,h2,h3{break-after:avoid;page-break-after:avoid}',
      'h1{font-size:20px;margin:0 0 6px}',
      'h2{font-size:15px;margin:0 0 8px;color:#1e293b}',
      '.directions{font-size:13px;color:#334155;margin:0 0 14px}',
      '.wall-list{display:grid;grid-template-columns:1fr;gap:14px}',
      '.wall-card{border:2px solid #0f172a;border-radius:10px;padding:14px 16px;background:#fff;page-break-inside:avoid;break-inside:avoid;overflow-wrap:anywhere}',
      '.wall-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;border-bottom:2px solid #cbd5e1;padding-bottom:10px;margin-bottom:10px}',
      '.wall-word{font-size:40px;font-weight:900;letter-spacing:.01em;line-height:1.1}',
      '.elkonin{display:flex;flex-wrap:wrap;gap:5px;align-items:center}',
      '.elkonin-box{border:2px solid #334155;min-width:26px;height:28px;padding:0 6px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;border-radius:5px}',
      '.wall-body{display:flex;gap:14px;align-items:flex-start}',
      '.wall-pic{width:88px;height:88px;object-fit:contain;border:1px solid #cbd5e1;border-radius:8px;background:#fff;flex-shrink:0}',
      '.wall-text{flex:1;min-width:0}',
      '.wall-def{margin:0 0 6px;font-size:15px;line-height:1.45}',
      '.wall-ex{margin:0;font-size:13px;color:#334155;line-height:1.4}',
      '.teacher-key{margin-top:24px;padding-top:14px;border-top:2px solid #0f172a;page-break-before:always;break-before:page}',
      '.key-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}',
      '.key-table tr{page-break-inside:avoid;break-inside:avoid}',
      '.key-table th,.key-table td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;vertical-align:top}',
      '.key-table th{background:#f1f5f9}',
      '.attr-note{font-size:12px;color:#475569;margin-top:10px}',
      PRINT_BAR_CSS,
      '@media print{@page{margin:12mm} body{margin:0;max-width:none} .noprint{display:none} .wall-card{page-break-inside:avoid;break-inside:avoid} .teacher-key{page-break-before:always;break-before:page}}',
      '</style>',
      '</head>',
      '<body>',
      PRINT_BAR_HTML,
      '<h1>' + titleSafe + ' — Classroom Word Wall Cards</h1>',
      '<p class="directions">Display on your classroom Word Wall or anchor chart so students can reference spelling patterns, sound boxes, and kid-friendly meanings during reading and writing.</p>',
      '<div class="wall-list">' + wallCardsHtml + '</div>',
      '<section class="teacher-key">',
      '<h2>Teacher Unit Word Wall Reference &amp; Attribution Key</h2>',
      '<table class="key-table"><thead><tr><th>#</th><th>Word</th><th>Sound Boxes</th><th>Meaning</th><th>Picture</th></tr></thead><tbody>' + keyRows + '</tbody></table>',
      '<p class="attr-note">Built-in picture artwork may use Mulberry Symbols or OpenMoji under CC BY-SA 4.0 unless a custom credit is shown above.</p>',
      '</section>',
      '</body>',
      '</html>',
    ].join('\n');
  }
  let _wpSylPromise = null;
  function ensureSyllableTableLoaded(docArg) {
    if (root.AlloModules && root.AlloModules.SyllableTableEn && typeof root.AlloModules.SyllableTableEn.lookup === 'function') {
      return Promise.resolve(root.AlloModules.SyllableTableEn);
    }
    if (_wpSylPromise) return _wpSylPromise;
    const d = docArg || (typeof document !== 'undefined' ? document : null);
    if (!d || !d.createElement) return Promise.resolve(null);
    _wpSylPromise = new Promise(resolve => {
      if (d.querySelector && d.querySelector('script[data-allo-syllable-table="1"]')) {
        resolve((root.AlloModules && root.AlloModules.SyllableTableEn) || null);
        return;
      }
      const sc = d.createElement('script');
      sc.src = 'syllable_table_en.js';
      sc.async = true;
      sc.setAttribute('data-allo-syllable-table', '1');
      sc.onload = () => resolve((root.AlloModules && root.AlloModules.SyllableTableEn) || null);
      sc.onerror = () => {
        _wpSylPromise = null;
        try { if (sc.parentNode) sc.parentNode.removeChild(sc); } catch (_) {}
        resolve(null);
      };
      (d.head || d.documentElement).appendChild(sc);
    });
    return _wpSylPromise;
  }
  function _splitSheetSyllables(word) {
    if (typeof word !== 'string' || word.length < 4 || !/^[A-Za-z]+$/.test(word)) return null;
    const tbl = root.AlloModules && root.AlloModules.SyllableTableEn;
    if (!tbl || typeof tbl.lookup !== 'function') return null;
    const found = tbl.lookup(word.toLowerCase());
    if (!found || found.check || !Array.isArray(found.parts) || found.parts.length < 2) return null;
    if (found.parts.join('').length !== word.length) return null;
    const out = []; let pos = 0;
    for (let i = 0; i < found.parts.length; i++) {
      out.push(word.slice(pos, pos + found.parts[i].length));
      pos += found.parts[i].length;
    }
    return out;
  }
  function applySheetReadingSupports(html, opts) {
    const o = opts || {};
    const useSyl = !!o.syllables, useBold = !!o.bold;
    if ((!useSyl && !useBold) || typeof html !== 'string' || !html) return html;
    const dotHtml = '<span aria-hidden="true" style="user-select:none;opacity:.6">\u00b7</span>';
    const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
    const SKIP_TAGS = new Set(['script', 'style', 'code', 'pre', 'svg', 'math', 'title', 'option', 'textarea']);
    const SKIP_CLASS_RE = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
    const hasSkipClass = tag => {
      const m = SKIP_CLASS_RE.exec(tag);
      if (!m) return false;
      const cls = m[1] || m[2] || m[3] || '';
      return /(?:^|\s)(?:noprint|ws-noprint|elkonin-box|bingo-free|ws-blank|ws-tile|ws-trace-letter|ws-box|ws-missing|ws-no-syl)(?:\s|$)/.test(cls);
    };
    const stack = [];
    let skipCount = 0, inBody = !/<body[\s>]/i.test(html);
    let out = html.replace(/(<[^>]+>)|([^<]+)/g, (all, tag, text) => {
      if (tag) {
        if (/^<![\s\S]*>$|^<\?[\s\S]*>$/.test(tag)) return tag;
        const closeMatch = /^<\/([a-z0-9:-]+)/i.exec(tag);
        if (closeMatch) {
          const name = closeMatch[1].toLowerCase();
          if (name === 'body') inBody = false;
          for (let idx = stack.length - 1; idx >= 0; idx--) {
            if (stack[idx].name === name) {
              while (stack.length > idx) {
                if (stack.pop().skipped) skipCount--;
              }
              break;
            }
          }
          return tag;
        }
        const openMatch = /^<([a-z0-9:-]+)/i.exec(tag);
        if (openMatch) {
          const name = openMatch[1].toLowerCase();
          if (name === 'body') inBody = true;
          if (!/\/\s*>$/.test(tag) && !VOID_TAGS.has(name)) {
            const skipped = SKIP_TAGS.has(name) || hasSkipClass(tag);
            stack.push({ name, skipped });
            if (skipped) skipCount++;
          }
        }
        return tag;
      }
      if (!inBody || skipCount > 0 || !text || !/[A-Za-z\u00C0-\u024F]{2,}/.test(text)) return text;
      return text.replace(/(&[a-z#0-9]+;)|([A-Za-z\u00C0-\u024F]{2,})/gi, (tok, ent, w) => {
        if (ent || !w) return tok;
        const syls = useSyl ? _splitSheetSyllables(w) : null;
        if (!useBold) return syls ? syls.join(dotHtml) : w;
        const cut = w.length <= 3 ? Math.max(1, w.length - 1) : Math.ceil(w.length * 0.45);
        if (!syls) return '<b data-awp-bionic="1">' + w.slice(0, cut) + '</b>' + w.slice(cut);
        let buf = '', offset = 0;
        for (let j = 0; j < syls.length; j++) {
          if (j > 0) buf += dotHtml;
          const seg = syls[j], end = offset + seg.length;
          if (end <= cut) buf += '<b data-awp-bionic="1">' + seg + '</b>';
          else if (offset >= cut) buf += seg;
          else {
            const partCut = cut - offset;
            buf += '<b data-awp-bionic="1">' + seg.slice(0, partCut) + '</b>' + seg.slice(partCut);
          }
          offset = end;
        }
        return buf;
      });
    });
    if (useBold) {
      const bionicCss = '.word,.frayer-word,.sort-word-text,.bank-word,.bingo-word,.loop-word,.wall-word,.ws-word{font-weight:400}b[data-awp-bionic]{font-weight:800}';
      if (!out.includes('b[data-awp-bionic]')) {
        if (/<\/style>/i.test(out)) out = out.replace(/<\/style>/i, '\n' + bionicCss + '\n</style>');
        else if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, '<style>' + bionicCss + '</style>\n</head>');
        else out = '<style>' + bionicCss + '</style>' + out;
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Word Sounds Activity Worksheets (13 Packets + 6 Main-App activities)
  // Standalone implementation for Main App + Present & Export (no dependency on packets-print-cards.js).
  // ---------------------------------------------------------------------------
  const WS_ACT_KEY_NOTICE = 'For the teacher \u2014 keep apart from the student copy';
  const WS_ACT_CSP = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'";
  const WS_ACT_META = {
    mapping: { label: 'Sound Mapping', directions: 'Say each word and write the letter or letters for each sound in the boxes.' },
    missing_letter: { label: 'Missing Letter', directions: 'Circle the missing letter and write it in the box.' },
    word_scramble: { label: 'Word Scramble', directions: 'Unscramble the letter tiles and write the word on the line.' },
    counting: { label: 'Sound Counting', directions: 'Say each word slowly. Circle the number of sounds you hear.' },
    isolation: { label: 'Find Sounds', directions: 'Listen for the sound asked in each prompt and circle the matching sound.' },
    segmentation: { label: 'Break It Down', directions: 'Tap one circle for each sound in the word. Then write the sounds or word on the line.' },
    blending: { label: 'Blend Sounds', directions: 'Put the separated sounds together. Write the blended word on the line or circle the matching word.' },
    rhyming: { label: 'Rhyme Time', directions: 'Read or look at the word. Circle the choice that rhymes with it.' },
    word_families: { label: 'Word Families', directions: 'Circle the words that belong to the word family, then write more words in the same family.' },
    sound_sort: { label: 'Sound Sort', directions: 'Sort the words from the word bank into the matching sound columns below.' },
    letter_tracing: { label: 'Letter Trace', directions: 'Trace each guide letter along the lines, then practice writing it beside the guides.' },
    orthography: { label: 'Sight & Spell', directions: 'Listen as your teacher reads each word aloud. Write each word on its line.' },
    spelling_bee: { label: 'Spelling Bee', directions: 'Listen carefully as your teacher reads each word aloud. Spell each word on its line.' },
    syllable_counting: { label: 'Syllable Counting', directions: 'Say each word and scoop or clap the syllables. Circle how many syllables you hear.' },
    syllable_blending: { label: 'Syllable Blending', directions: 'Blend the word parts together. Write the whole word on the line or circle the match.' },
    manipulation: { label: 'Sound Switch', directions: 'Follow each sound-change prompt. Write the new word on the line or circle the match.' },
    decoding: { label: 'Word Reading', directions: 'Read each word aloud. Check the box when you read it and circle its matching picture if shown.' },
    read_sentence: { label: 'Read a Sentence', directions: 'Read each sentence aloud. Circle the word that fits best and write it in the blank.' },
    read_passage: { label: 'Read a Story', directions: 'Read the passage aloud and check a box each time you read it. Then answer the question below.' },
    sentence_match: { label: 'Sentence Match', directions: 'Read the sentence and number the pictures or words in order.' },
  };
  const WS_ACT_NO_SYL = { missing_letter: 1, word_scramble: 1, letter_tracing: 1, mapping: 1, syllable_counting: 1 };
  const WS_ACT_FRIENDLY_SOUND = { oo_short: 'short oo', dh: 'th (this)', zh: 'zh', schwa: 'uh' };
  const WS_ACT_ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
  const WS_ACT_DEFAULTS = ['mapping', 'missing_letter', 'word_scramble', 'counting'];
  const WS_ACT_LICENSE_DEEDS = { 'CC BY-SA 4.0': 'creativecommons.org/licenses/by-sa/4.0' };
  const WS_ACT_CSS = [
    '@page{margin:12mm}',
    '*{box-sizing:border-box}',
    'body{font-family:Arial,Helvetica,sans-serif;background:#ffffff;color:#000000;margin:16px auto;max-width:190mm;padding:0 12px;line-height:1.35}',
    '.ws-noprint{margin:0 0 12px;padding:8px 12px;border:1px solid #000000;font-size:13px;background:#ffffff;color:#000000}',
    '.ws-header{border-bottom:2px solid #000000;padding-bottom:10px;margin-bottom:14px}',
    '.ws-title{margin:0 0 10px;font-size:22px;font-weight:700;color:#000000}',
    '.ws-meta{display:flex;flex-wrap:wrap;gap:10px 28px;font-size:14px;font-weight:700}',
    '.ws-meta-field{display:inline-flex;align-items:baseline;gap:8px;flex:1 1 200px}',
    '.ws-meta-line{flex:1 1 auto;border-bottom:1.5px solid #000000;min-width:110px;height:16px}',
    '.ws-section{margin-top:18px}',
    '.ws-section-head{break-after:avoid;page-break-after:avoid;margin-bottom:8px}',
    '.ws-section-title{margin:0 0 4px;font-size:17px;font-weight:700;color:#000000}',
    '.ws-directions{margin:0;font-size:13px;color:#000000}',
    '.ws-list{list-style:none;margin:6px 0 0;padding:0}',
    '.ws-item{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid #808080;break-inside:avoid;page-break-inside:avoid}',
    '.ws-num{min-width:26px;font-size:15px;font-weight:700}',
    '.ws-body{flex:1 1 auto;min-width:0}',
    '.ws-prompt{margin:0 0 6px;font-size:14px;font-weight:700}',
    '.ws-row{display:flex;flex-wrap:wrap;align-items:center;gap:12px}',
    '.ws-pic{display:block;width:64px;height:64px;object-fit:contain;border:1px solid #808080;padding:3px;background:#ffffff;flex:none}',
    '.ws-pic-sm{display:block;width:36px;height:36px;object-fit:contain;flex:none}',
    '.ws-word{font-size:21px;font-weight:700;letter-spacing:.02em;overflow-wrap:anywhere}',
    '.pc-dot{font-weight:400;color:#808080;margin:0 -0.02em}',
    '.ws-boxes{display:inline-flex;flex-wrap:wrap;align-items:center}',
    '.ws-box{display:inline-block;width:42px;height:42px;border:2px solid #000000;background:#ffffff}',
    '.ws-box+.ws-box{margin-left:-2px}',
    '.ws-bank{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px;font-size:13px}',
    '.ws-bank-label{font-weight:700;margin-right:4px}',
    '.ws-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border:1.5px solid #000000;border-radius:5px;font-size:14px;font-weight:700;background:#ffffff}',
    '.ws-missing{display:inline-flex;align-items:center;gap:4px;font-size:26px;font-weight:700;letter-spacing:.04em}',
    '.ws-blank{display:inline-block;min-width:34px;height:36px;border:2px solid #000000;border-radius:5px;background:#ffffff;vertical-align:middle}',
    '.ws-tiles{display:inline-flex;flex-wrap:wrap;gap:8px}',
    '.ws-tile{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:38px;padding:0 8px;border:2px solid #000000;border-radius:6px;font-size:20px;font-weight:700;background:#ffffff}',
    '.ws-choices{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:8px 0 0;padding:0}',
    '.ws-choice{display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border:1.5px solid #000000;border-radius:999px;font-size:15px;font-weight:700;background:#ffffff}',
    '.ws-bubbles{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:8px 0 0;padding:0}',
    '.ws-bubble{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 6px;border:1.5px solid #000000;border-radius:999px;font-size:15px;font-weight:700;background:#ffffff}',
    '.ws-tap-dots{display:inline-flex;flex-wrap:wrap;gap:10px;align-items:center}',
    '.ws-tap-dot{display:inline-block;width:32px;height:32px;border:2px solid #000000;border-radius:999px;background:#ffffff}',
    '.ws-sounds-seq{font-size:20px;font-weight:700;letter-spacing:.04em}',
    '.ws-line{width:100%;max-width:380px;height:36px;margin-top:8px;border-bottom:2px solid #000000;border-top:1px dashed #808080}',
    '.ws-build-lines{display:flex;flex-wrap:wrap;gap:12px 26px;margin-top:10px;font-size:18px;font-weight:700}',
    '.ws-build-slot{display:inline-flex;align-items:baseline}',
    '.ws-build-blank{display:inline-block;width:52px;border-bottom:2px solid #000000;margin-right:2px}',
    '.ws-sort-bank{border:1.5px solid #000000;border-radius:6px;padding:8px 10px;margin:8px 0 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:#ffffff}',
    '.ws-sort-cols{display:grid;gap:10px;margin-top:8px}',
    '.ws-sort-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}',
    '.ws-sort-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}',
    '.ws-sort-col{border:1.5px solid #000000;border-radius:6px;padding:8px 10px;min-height:130px;background:#ffffff;break-inside:avoid;page-break-inside:avoid}',
    '.ws-sort-col-head{margin:0 0 8px;padding-bottom:6px;border-bottom:1.5px solid #000000;font-size:14px;font-weight:700;text-align:center}',
    '.ws-sort-line{height:28px;border-bottom:1px solid #808080}',
    '.ws-trace-wrap{display:flex;flex-direction:column;gap:10px;margin-top:8px}',
    '.ws-trace-row{position:relative;display:flex;align-items:flex-end;gap:22px;height:78px;max-width:560px;border-top:2px solid #000000;border-bottom:2px solid #000000;padding:0 12px;background:#ffffff}',
    '.ws-trace-row::before{content:"";position:absolute;left:0;right:0;top:50%;border-top:1.5px dashed #808080}',
    '.ws-trace-letter{position:relative;z-index:1;font-size:66px;line-height:.88;font-weight:400;font-family:Arial,Helvetica,sans-serif;color:#808080}',
    '@supports (-webkit-text-stroke:1px #000000){.ws-trace-letter{color:#ffffff;-webkit-text-stroke:1.6px #808080}}',
    '.ws-scoops{display:inline-flex;gap:8px;align-items:center;margin-top:6px}',
    '.ws-scoop{display:inline-block;width:52px;height:18px;border-bottom:2px solid #000000;border-left:1px solid #808080;border-right:1px solid #808080;border-radius:0 0 18px 18px}',
    '.ws-fluency{display:flex;flex-wrap:wrap;gap:14px;margin-top:8px;font-size:13px}',
    '.ws-check-item{display:inline-flex;align-items:center;gap:6px}',
    '.ws-checkbox{display:inline-block;width:16px;height:16px;border:1.5px solid #000000;background:#ffffff}',
    '.ws-passage{margin:6px 0 8px;padding:10px 12px;border:1.5px solid #000000;font-size:15px;line-height:1.65}',
    '.ws-passage p{margin:0 0 6px}.ws-passage p:last-child{margin-bottom:0}',
    '.ws-credits{margin-top:18px;padding-top:8px;border-top:1px solid #808080;font-size:11px;line-height:1.4;color:#000000}',
    '.ws-credits p{margin:2px 0;overflow-wrap:anywhere}',
    '.ws-key{break-before:page;page-break-before:always;margin-top:24px;padding-top:12px;border-top:2px solid #000000}',
    '.ws-key-banner{margin:0 0 12px;padding:8px 12px;border:2px solid #000000;font-size:14px;font-weight:700;background:#ffffff}',
    '.ws-key h2{margin:0 0 8px;font-size:18px}.ws-key h3{margin:12px 0 4px;font-size:15px}',
    '.ws-key-list{margin:4px 0 10px;padding-left:24px;font-size:14px;line-height:1.55}',
    '.ws-key-list li{margin:4px 0;break-inside:avoid;page-break-inside:avoid}',
    '@media print{body{margin:0;max-width:none;padding:0}.ws-noprint{display:none}.ws-key{break-before:page;page-break-before:always;margin-top:0;border-top:none}}',
  ].join('');

  function _wsHash(text) {
    let h = 2166136261 >>> 0;
    const s = String(text || '');
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function _wsShuffle(list, seedText) {
    const out = (Array.isArray(list) ? list : []).slice();
    let h = _wsHash(seedText) || 1;
    for (let i = out.length - 1; i > 0; i--) {
      h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
      const j = h % (i + 1);
      const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }
  function _wsSoundLabel(raw) {
    const s = String(raw == null ? '' : raw).replace(/^\/|\/$/g, '').trim();
    if (!s) return '';
    return Object.prototype.hasOwnProperty.call(WS_ACT_FRIENDLY_SOUND, s) ? '/' + WS_ACT_FRIENDLY_SOUND[s] + '/' : '/' + s + '/';
  }
  function _wsIsPic(uri) {
    return typeof uri === 'string' && /^data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml)[;,]/i.test(uri);
  }
  function _wsSvgUri(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(String(svg));
  }
  function _wsEstimatePhonemes(word) {
    const w = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return [];
    const trigraphs = ['igh', 'tch', 'dge'];
    const digraphs = ['sh', 'ch', 'th', 'wh', 'ph', 'ng', 'ck', 'qu', 'wr', 'kn', 'gn', 'mb', 'ar', 'er', 'ir', 'or', 'ur', 'ai', 'ay', 'au', 'aw', 'ea', 'ee', 'ei', 'ey', 'ew', 'ie', 'oa', 'oe', 'oi', 'oo', 'ou', 'ow', 'oy', 'ue'];
    const res = [];
    const silentE = w.length >= 4 && w[w.length - 1] === 'e' && /[aeiou]/.test(w.slice(0, -1)) && !/[aeiou]/.test(w[w.length - 2]) && !w.endsWith('le');
    const end = silentE ? w.length - 1 : w.length;
    let i = 0;
    while (i < end) {
      if (i + 3 <= end && trigraphs.includes(w.slice(i, i + 3))) { res.push(w.slice(i, i + 3)); i += 3; }
      else if (i + 2 <= end && digraphs.includes(w.slice(i, i + 2))) { res.push(w.slice(i, i + 2)); i += 2; }
      else if (w[i] === 'c' && i + 1 < end && 'eiy'.includes(w[i + 1])) { res.push('s'); i += 1; }
      else if (w[i] === 'c') { res.push('k'); i += 1; }
      else if (w[i] === 'g' && i + 1 < end && 'eiy'.includes(w[i + 1])) { res.push('j'); i += 1; }
      else { res.push(w[i]); i += 1; }
    }
    return res.length ? res : [w];
  }
  function _wsResolvePhonemes(word, entry, ctx) {
    const isAud = v => typeof v === 'string' && /^a\d+$/.test(v);
    const clean = arr => arr.map(p => {
      if (typeof p === 'string') return isAud(p) ? '' : p.trim();
      if (p && typeof p === 'object') return String(p.soundKey || p.phoneme || p.label || p.sound || p.text || '').trim();
      return '';
    }).filter(Boolean);
    if (entry && Array.isArray(entry.phonemes) && entry.phonemes.length) {
      const p1 = clean(entry.phonemes);
      if (p1.length) return p1;
    }
    if (entry && Array.isArray(entry.sounds) && entry.sounds.length && !entry.sounds.some(isAud)) {
      const p2 = clean(entry.sounds);
      if (p2.length) return p2;
    }
    const low = String(word || '').trim().toLowerCase();
    if (low) {
      if (ctx && ctx.core && typeof ctx.core.dictionarySounds === 'function') {
        try { const ds = ctx.core.dictionarySounds(low); if (ds && Array.isArray(ds.sounds) && ds.sounds.length) return ds.sounds.slice(); } catch (_) {}
      }
      const dictObj = (ctx && ctx.dictionary) || (root && root.AlloModules && root.AlloModules.WordSoundsPhonemes) || null;
      if (dictObj && typeof dictObj.lookup === 'function') {
        try { const found = dictObj.lookup(low); if (found && Array.isArray(found[0]) && found[0].length) return Array.from(found[0]); } catch (_) {}
      }
    }
    return _wsEstimatePhonemes(low);
  }
  function _wsEstimateSyllables(word) {
    const w = String(word || '').trim();
    if (!w) return [];
    const low = w.toLowerCase().replace(/[^a-z]/g, '');
    if (low.length <= 3) return [w];
    const trimmed = low.length > 3 && low.endsWith('e') && !low.endsWith('le') ? low.slice(0, -1) : low;
    const groups = trimmed.match(/[aeiouy]+/g) || [];
    const countN = Math.max(1, groups.length);
    if (countN === 1) return [w];
    const step = Math.max(1, Math.round(w.length / countN));
    const out = [];
    for (let i = 0; i < countN; i++) {
      const start = i * step;
      const end = i === countN - 1 ? w.length : Math.min(w.length, (i + 1) * step);
      if (start < end) out.push(w.slice(start, end));
    }
    return out.length ? out : [w];
  }
  function _wsFmtSyl(text, useSyl) {
    const str = String(text == null ? '' : text);
    if (!useSyl) return escHtml(str);
    return str.replace(/[A-Za-z]+/g, tok => {
      const parts = tok.length >= 4 ? _splitSheetSyllables(tok) : null;
      if (!parts || parts.length < 2) return escHtml(tok);
      return parts.map(escHtml).join('<span class="pc-dot" aria-hidden="true">\u00b7</span>');
    });
  }
  function _wsRimeOf(word) {
    const s = String(word || '').toLowerCase();
    const m = /[aeiouy][a-z]*$/.exec(s);
    return m ? m[0] : s.slice(-2);
  }
  function _wsScramble(word) {
    const letters = String(word || '').toLowerCase().split('').filter(ch => /[a-z0-9]/i.test(ch));
    if (letters.length < 2) return letters;
    const out = _wsShuffle(letters, 'scramble|' + word);
    if (out.join('') === letters.join('')) {
      for (let i = 1; i < out.length; i++) {
        if (out[i] !== out[0]) { const t = out[0]; out[0] = out[i]; out[i] = t; break; }
      }
    }
    return out;
  }
  function _wsOwnEntry(own, word) {
    if (!own || typeof own !== 'object') return null;
    if (Object.prototype.hasOwnProperty.call(own, word)) return own[word];
    const low = String(word || '').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(own, low)) return own[low];
    for (const k of Object.keys(own)) if (k.toLowerCase() === low) return own[k];
    return null;
  }
  function _wsSafeImg(value, imagesMap) {
    if (!value) return '';
    if (typeof value === 'string') {
      if (imagesMap && Object.prototype.hasOwnProperty.call(imagesMap, value)) {
        const res = imagesMap[value];
        return _wsIsPic(res) ? res : '';
      }
      return _wsIsPic(value) ? value : '';
    }
    if (typeof value === 'object') {
      if (value.none === true) return '';
      const cand = value.src || value.dataUri || value.uri || '';
      return _wsIsPic(cand) ? cand : '';
    }
    return '';
  }
  function _wsSetCredit(symbols, setName) {
    const credits = symbols && symbols.credits ? symbols.credits : null;
    const credit = credits && Object.prototype.hasOwnProperty.call(credits, setName) && credits[setName]
      ? credits[setName]
      : (setName === 'mulberry' && symbols && symbols.credit ? symbols.credit : null);
    if (!credit) {
      if (setName === 'diagram') return 'AlloFlow Curriculum Diagrams (AGPL-3.0).';
      if (setName === 'openmoji') return 'OpenMoji by the OpenMoji project. License: CC BY-SA 4.0 (creativecommons.org/licenses/by-sa/4.0). openmoji.org';
      if (setName === 'mulberry') return 'Mulberry Symbols by Steve Lee. License: CC BY-SA 4.0 (creativecommons.org/licenses/by-sa/4.0). mulberrysymbols.org';
      return '';
    }
    const deed = Object.prototype.hasOwnProperty.call(WS_ACT_LICENSE_DEEDS, credit.license) ? WS_ACT_LICENSE_DEEDS[credit.license] : '';
    return credit.set + (credit.author ? ' by ' + credit.author : '') + '. License: ' + credit.license + (deed ? ' (' + deed + ')' : '') + (credit.url ? '. ' + credit.url : '');
  }
  function _wsSynthesizeItem(activity, rawEntry, allWords, ctx) {
    const entry = typeof rawEntry === 'string' ? { word: rawEntry } : (rawEntry && typeof rawEntry === 'object' ? rawEntry : {});
    const word = String(entry.word || entry.targetWord || entry.term || entry.printed || entry.target || '').trim();
    const board = entry.activityItems && entry.activityItems[activity] && typeof entry.activityItems[activity] === 'object' ? entry.activityItems[activity] : null;
    const phonemes = _wsResolvePhonemes(word, entry, ctx);
    const low = word.toLowerCase();
    const rawG = (entry.graphemes && entry.graphemes.length ? entry.graphemes : null) || (board && Array.isArray(board.graphemes) && board.graphemes.length ? board.graphemes : null);
    const graphemes = rawG && rawG.join('').toLowerCase() === low ? rawG.map(String) : (low ? low.split('') : []);
    const base = Object.assign({}, board || {}, entry, { word, phonemes, graphemes });

    if (activity === 'mapping') {
      const spans = Array.isArray(base.spans) ? base.spans : (Array.isArray(base.chipSpans) ? base.chipSpans : null);
      const soundCount = spans ? spans.reduce((a, b) => a + (Number(b) || 1), 0) : (phonemes.length || graphemes.length || low.length || 3);
      const bank = Array.isArray(base.chips) && base.chips.length
        ? base.chips.map(c => typeof c === 'string' ? c : String((c && (c.text || c.label)) || '')).filter(Boolean)
        : (Array.isArray(base.chipOrder) && base.chipOrder.length
            ? base.chipOrder.map(c => String((c && c.text) || '')).filter(Boolean)
            : _wsShuffle(graphemes.length ? graphemes : low.split(''), 'map|' + low));
      if (bank.length > 1 && bank.join('').toLowerCase() === low) { const t = bank[0]; bank[0] = bank[bank.length - 1]; bank[bank.length - 1] = t; }
      return { word, phonemes, graphemes, spans, soundCount: Math.max(1, soundCount), bank, item: base };
    }
    if (activity === 'missing_letter') {
      let lettersArr = Array.isArray(base.letters) && base.letters.length ? base.letters.slice() : null;
      const hiddenIndex = Number.isInteger(base.hiddenIndex) && base.hiddenIndex >= 0 && base.hiddenIndex < word.length ? base.hiddenIndex : (word.length > 2 ? 1 : 0);
      const correctLetter = String(base.correctLetter || (lettersArr ? base.target : '') || word.charAt(hiddenIndex) || '').toLowerCase();
      if (!lettersArr) { lettersArr = word.split(''); if (lettersArr.length) lettersArr[hiddenIndex] = ''; }
      let opts = Array.isArray(base.options) && base.options.length ? base.options.map(String) : [];
      if (!opts.length && correctLetter) {
        const isVowel = 'aeiou'.includes(correctLetter);
        const pool = (isVowel ? 'aeiou' : 'bcdfghjklmnprstvwz').split('').filter(c => c !== correctLetter);
        opts = _wsShuffle([correctLetter].concat(_wsShuffle(pool, 'ml|' + low).slice(0, 3)), 'mlo|' + low);
      }
      if (base.capital) opts = opts.map(c => c.toUpperCase());
      return { word, letters: lettersArr, hiddenIndex, correctLetter: base.capital ? correctLetter.toUpperCase() : correctLetter, choices: opts, item: base };
    }
    if (activity === 'word_scramble') {
      let tiles = Array.isArray(base.letters) && base.letters.length ? base.letters.map(String) : _wsScramble(word);
      if (tiles.length > 1 && tiles.join('').toLowerCase() === low) tiles = _wsScramble(word);
      return { word, tiles, item: base };
    }
    if (activity === 'counting') {
      const cnt = Number(base.answer) || Number(base.target) || Number(base.phonemeCount) || phonemes.length || 3;
      const maxBubble = Math.max(6, Math.min(10, cnt >= 6 ? cnt + 1 : 6));
      const vals = [];
      for (let i = 1; i <= maxBubble; i++) vals.push(String(i));
      if (cnt >= 11) vals.push('11+');
      return { word, phonemes, answer: cnt >= 11 ? '11+' : String(cnt), values: vals, item: base };
    }
    if (activity === 'isolation') {
      const pos = Number.isInteger(base.position) && base.position >= 0 ? base.position : 0;
      let posName = base.positionName || (pos === 0 ? 'beginning' : (phonemes.length > 1 && pos === phonemes.length - 1 ? 'ending' : (pos === 1 && phonemes.length === 3 ? 'middle' : (WS_ACT_ORDINALS[pos] || (pos + 1) + 'th'))));
      if (posName === 'first') posName = 'beginning';
      if (posName === 'last') posName = 'ending';
      const correct = String(base.correctSound || (typeof base.target === 'string' && base.target !== word ? base.target : '') || phonemes[pos] || phonemes[0] || low.charAt(0));
      let rawChoices = Array.isArray(base.choices) && base.choices.length
        ? base.choices.map(c => typeof c === 'string' ? c : String((c && (c.label || c.text)) || '')).filter(Boolean)
        : (Array.isArray(base.options) && base.options.length ? base.options.map(String) : []);
      if (!rawChoices.length) {
        const pool = ['s', 'm', 't', 'p', 'k', 'n', 'b', 'd', 'a', 'e', 'i', 'o', 'u', 'sh', 'ch'].filter(s => s !== correct);
        rawChoices = _wsShuffle([correct].concat(_wsShuffle(pool, 'iso|' + low).slice(0, 3)), 'isoo|' + low);
      }
      return { word, position: pos, positionName: posName, correctSound: correct, choices: rawChoices, item: base };
    }
    if (activity === 'segmentation') {
      const segSounds = phonemes.length ? phonemes : _wsEstimatePhonemes(low);
      const segChips = Array.isArray(base.chips) && base.chips.length
        ? base.chips.map(c => typeof c === 'string' ? c : String((c && (c.label || c.phoneme || c.text)) || '')).filter(Boolean)
        : [];
      return { word, sounds: segSounds, slotCount: Number(base.slotCount) || segSounds.length || 3, chips: segChips, item: base };
    }
    if (activity === 'blending') {
      const blendSounds = phonemes.length ? phonemes : _wsEstimatePhonemes(low);
      const blendChoices = Array.isArray(base.choices) && base.choices.length
        ? base.choices.map(c => typeof c === 'string' ? c : String((c && (c.text || c.label)) || '')).filter(Boolean)
        : (Array.isArray(base.options) && base.options.length ? base.options.map(String) : []);
      return { word, sounds: blendSounds, choices: blendChoices, item: base };
    }
    if (activity === 'rhyming') {
      let answer = String(base.answer || (typeof base.target === 'string' && base.target.toLowerCase() !== low ? base.target : '') || base.rhymeWord || (Array.isArray(base.rhymes) && base.rhymes[0]) || '');
      let rChoices = Array.isArray(base.choices) && base.choices.length
        ? base.choices.map(c => typeof c === 'string' ? c : String((c && (c.text || c.label)) || '')).filter(Boolean)
        : (Array.isArray(base.options) && base.options.length ? base.options.map(String) : []);
      if (!rChoices.length) {
        const rime = _wsRimeOf(low);
        if (!answer) answer = (low.charAt(0) === 'b' ? 'm' : 'b') + rime;
        const others = allWords.filter(w => w.toLowerCase() !== low && w.toLowerCase() !== answer.toLowerCase()).slice(0, 3);
        const fillers = ['dog', 'sun', 'bed', 'map'].filter(w => w !== low && w !== answer.toLowerCase() && !others.includes(w));
        rChoices = _wsShuffle([answer].concat(others, fillers).slice(0, 4), 'rhy|' + low);
      }
      return { word, answer: answer || rChoices[0] || '', choices: rChoices, item: base };
    }
    if (activity === 'word_families') {
      const rimeVal = String(base.rime || base.familyEnding || _wsRimeOf(low)).replace(/^-/, '');
      let wfChips = Array.isArray(base.chips) && base.chips.length
        ? base.chips.map(c => typeof c === 'string' ? { text: c, member: c.toLowerCase().endsWith(rimeVal) } : { text: String(c.text || ''), member: !!c.member }).filter(c => c.text)
        : [];
      if (!wfChips.length) {
        const mem = (Array.isArray(base.options) ? base.options : Array.isArray(base.familyMembers) ? base.familyMembers : []).map(String).filter(Boolean);
        const dis = (Array.isArray(base.distractors) ? base.distractors : allWords.filter(w => w.toLowerCase() !== low && !w.toLowerCase().endsWith(rimeVal)).slice(0, 2)).map(String).filter(Boolean);
        wfChips = _wsShuffle(mem.map(t => ({ text: t, member: true })).concat(dis.map(t => ({ text: t, member: false }))), 'wf|' + low);
      }
      return { word, rime: rimeVal, chips: wfChips, members: wfChips.filter(c => c.member).map(c => c.text), item: base };
    }
    if (activity === 'sound_sort') {
      const sortMode = base.mode === 'last' ? 'last' : 'first';
      const sortSound = String(base.sound || base.targetChar || (sortMode === 'last' ? phonemes[phonemes.length - 1] : phonemes[0]) || low.charAt(0));
      let sortChips = Array.isArray(base.chips) && base.chips.length
        ? base.chips.map(c => typeof c === 'string' ? { text: c, member: true } : { text: String(c.text || ''), member: !!c.member }).filter(c => c.text)
        : [];
      if (!sortChips.length) {
        const sMem = (Array.isArray(base.options) ? base.options : [word]).map(String).filter(Boolean);
        const sDis = (Array.isArray(base.distractors) ? base.distractors : allWords.filter(w => w.toLowerCase() !== low).slice(0, 2)).map(String).filter(Boolean);
        sortChips = _wsShuffle(sMem.map(t => ({ text: t, member: true })).concat(sDis.map(t => ({ text: t, member: false }))), 'ss|' + low);
      }
      return { word, mode: sortMode, sound: sortSound, chips: sortChips, item: base };
    }
    if (activity === 'letter_tracing') {
      const firstLetter = String(base.letter || word.charAt(0) || 'a').trim().charAt(0) || 'a';
      const rawParts = Array.isArray(base.parts) && base.parts.length ? base.parts : null;
      const traceCase = base.cases || (ctx && ctx.tracing) || 'both';
      const parts = rawParts
        ? rawParts.map(p => ({ letter: String(p.letter || firstLetter), kind: String(p.kind || '') }))
        : (traceCase === 'capital' ? [{ letter: firstLetter.toUpperCase(), kind: 'capital' }]
          : traceCase === 'lowercase' ? [{ letter: firstLetter.toLowerCase(), kind: 'lowercase' }]
          : [{ letter: firstLetter.toUpperCase(), kind: 'capital' }, { letter: firstLetter.toLowerCase(), kind: 'lowercase' }]);
      return { word, letter: firstLetter, parts, item: base };
    }
    if (activity === 'orthography' || activity === 'spelling_bee') {
      const letterBank = Array.isArray(base.letterBank) && base.letterBank.length ? base.letterBank.map(String) : null;
      return { word, phonemes, soundCount: phonemes.length || low.length || 3, letterBank, lengthHint: !!base.lengthHint, item: base };
    }
    if (activity === 'syllable_counting') {
      const syls = Array.isArray(base.syllables) && base.syllables.length ? base.syllables.map(String) : (_splitSheetSyllables(word) || _wsEstimateSyllables(word));
      const count = Number(base.count) || Number(base.answer) || Number(base.target) || syls.length || 1;
      const maxSyl = Math.max(5, Math.min(8, count + 1));
      const values = [];
      for (let i = 1; i <= maxSyl; i++) values.push(String(i));
      return { word, syllables: syls, count, values, item: base };
    }
    if (activity === 'syllable_blending') {
      const syllables = Array.isArray(base.syllables) && base.syllables.length ? base.syllables.map(String)
        : (Array.isArray(base.units) && base.units.length ? base.units.map(u => String((u && u.text) || u || '')).filter(Boolean)
          : (_splitSheetSyllables(word) || _wsEstimateSyllables(word)));
      const choices = Array.isArray(base.choices) && base.choices.length
        ? base.choices.map(c => typeof c === 'string' ? c : String((c && (c.text || c.label)) || '')).filter(Boolean)
        : (Array.isArray(base.options) && base.options.length ? base.options.map(String) : []);
      return { word, syllables, choices, item: base };
    }
    if (activity === 'manipulation') {
      const task = base.task || base.manipulationTask || {};
      const answer = String(base.answer || task.answer || (typeof base.target === 'string' && base.target.toLowerCase() !== low ? base.target : '') || (low.length > 2 ? low.slice(1) : word));
      const prompt = String(base.instructionText || task.instruction || ('Say "' + word + '". Now say it without the first sound.'));
      const choices = Array.isArray(base.choices) && base.choices.length
        ? base.choices.map(c => typeof c === 'string' ? c : String((c && (c.text || c.label)) || '')).filter(Boolean)
        : (Array.isArray(base.options) && base.options.length ? base.options.map(String) : []);
      return { word, prompt, answer, choices, item: base };
    }
    if (activity === 'decoding') {
      const choices = Array.isArray(base.choices) && base.choices.length
        ? base.choices.map(c => typeof c === 'string' ? { text: c, image: '' } : { text: String(c.text || c.label || ''), image: c.image || '' }).filter(c => c.text)
        : [];
      return { word: String(base.printed || word), choices, item: base };
    }
    if (activity === 'read_sentence') {
      const answer = String(base.answer || word);
      let before = base.before != null ? String(base.before) : '';
      let after = base.after != null ? String(base.after) : '';
      if (!before && !after) {
        const sent = String(base.sentence || base.example || ('I see a ' + word + '.'));
        const reW = new RegExp('\\b' + answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        const idxM = sent.search(reW);
        if (idxM >= 0) { before = sent.slice(0, idxM); after = sent.slice(idxM + answer.length); }
        else { before = sent + ' '; after = '.'; }
      }
      const options = Array.isArray(base.options) && base.options.length
        ? base.options.map(c => typeof c === 'string' ? c : String((c && (c.text || c.label)) || '')).filter(Boolean)
        : (Array.isArray(base.choices) ? base.choices.map(c => typeof c === 'string' ? c : String((c && (c.text || c.label)) || '')).filter(Boolean) : [answer]);
      return { word, before, after, answer, options, item: base };
    }
    if (activity === 'read_passage') {
      const rawLines = Array.isArray(base.lines) && base.lines.length ? base.lines
        : (Array.isArray(base.story) && base.story.length ? base.story
          : (typeof base.story === 'string' && base.story.trim() ? base.story.trim().split(/\r?\n/) : ['Read a short sentence using the word ' + word + '.']));
      const lines = rawLines.map(ln => {
        if (typeof ln === 'string') return { text: ln };
        if (ln && typeof ln === 'object') {
          if (ln.before != null || ln.after != null) return { before: String(ln.before || ''), after: String(ln.after || '') };
          return { text: String(ln.text || '') };
        }
        return { text: '' };
      }).filter(ln => ln.text || ln.before || ln.after);
      const options = Array.isArray(base.options) && base.options.length
        ? base.options.map(c => typeof c === 'string' ? c : String((c && (c.text || c.label)) || '')).filter(Boolean)
        : [];
      return { word, lines, options, answer: String(base.answer || base.target || word), item: base };
    }
    return { word, item: base };
  }
  function _wsBuildSortBoards(items) {
    const byCat = Object.create(null), orderCats = [];
    items.forEach(it => {
      const key = it.mode + '|' + it.sound.toLowerCase();
      if (!byCat[key]) { byCat[key] = { key, mode: it.mode, sound: it.sound, anchor: it.word, members: [], distractors: [] }; orderCats.push(key); }
      const cat = byCat[key];
      (it.chips || []).forEach(ch => {
        const bucket = ch.member ? cat.members : cat.distractors;
        if (!bucket.includes(ch.text)) bucket.push(ch.text);
      });
    });
    const boards = [];
    if (orderCats.length === 1) {
      const sole = byCat[orderCats[0]];
      const prep = sole.mode === 'last' ? 'Ends with ' : 'Starts with ';
      const neg = sole.mode === 'last' ? 'Does not end with ' : 'Does not start with ';
      boards.push({
        columns: [
          { heading: prep + _wsSoundLabel(sole.sound) + (sole.anchor ? ' (like ' + sole.anchor + ')' : ''), words: sole.members.slice() },
          { heading: neg + _wsSoundLabel(sole.sound), words: sole.distractors.slice() },
        ],
        bank: _wsShuffle(sole.members.concat(sole.distractors), 'sort1|' + sole.key),
      });
    } else {
      for (let i = 0; i < orderCats.length; ) {
        const rem = orderCats.length - i;
        const take = rem === 4 ? 2 : Math.min(3, rem);
        const slice = orderCats.slice(i, i + take);
        const cols = [], bankWords = [], seenW = Object.create(null);
        slice.forEach(k => {
          const c = byCat[k];
          const prep2 = c.mode === 'last' ? 'Ends with ' : 'Starts with ';
          const ws = c.members.length ? c.members.slice() : (c.anchor ? [c.anchor] : []);
          cols.push({ heading: prep2 + _wsSoundLabel(c.sound) + (c.anchor ? ' (like ' + c.anchor + ')' : ''), words: ws });
          ws.forEach(w => { if (!seenW[w.toLowerCase()]) { seenW[w.toLowerCase()] = true; bankWords.push(w); } });
        });
        boards.push({ columns: cols, bank: _wsShuffle(bankWords, 'sortm|' + slice.join(',')) });
        i += take;
      }
    }
    return boards;
  }
  function _wsKeyLine(activity, it) {
    if (activity === 'mapping') return it.word + ' \u2014 ' + (it.graphemes.length ? it.graphemes.join(' \u00b7 ') : it.word) + ' (' + it.soundCount + ' ' + (it.soundCount === 1 ? 'sound' : 'sounds') + ')';
    if (activity === 'missing_letter') return it.word + ' \u2014 missing letter: ' + it.correctLetter;
    if (activity === 'word_scramble') return it.word + ' (tiles: ' + (it.tiles || []).join(', ') + ')';
    if (activity === 'counting') return it.word + ' \u2014 ' + it.answer + ' ' + (String(it.answer) === '1' ? 'sound' : 'sounds') + ' (' + (it.phonemes || []).map(_wsSoundLabel).join(' ') + ')';
    if (activity === 'isolation') return it.word + ' \u2014 ' + it.positionName + ' sound: ' + _wsSoundLabel(it.correctSound);
    if (activity === 'segmentation') return it.word + ' \u2014 ' + (it.sounds || []).map(_wsSoundLabel).join(' \u00b7 ') + ' (' + it.slotCount + ' ' + (it.slotCount === 1 ? 'sound' : 'sounds') + ')';
    if (activity === 'blending') return it.word + ' \u2014 Say: ' + (it.sounds || []).map(_wsSoundLabel).join(' \u00b7 ');
    if (activity === 'rhyming') return it.word + ' \u2014 rhymes with: ' + it.answer;
    if (activity === 'word_families') return '-' + it.rime + ' family (like ' + it.word + ') \u2014 ' + (it.members && it.members.length ? it.members.join(', ') : 'any real word ending in -' + it.rime);
    if (activity === 'letter_tracing') return it.parts.map(p => p.letter).join(' / ') + ' (for ' + it.word + ') \u2014 Practice only';
    if (activity === 'orthography' || activity === 'spelling_bee') return 'Read aloud: "' + it.word + '" \u2014 Spelling: ' + it.word + ' (' + it.soundCount + ' ' + (it.soundCount === 1 ? 'sound' : 'sounds') + ': ' + (it.phonemes || []).map(_wsSoundLabel).join(' ') + ')';
    if (activity === 'syllable_counting') return it.word + ' \u2014 ' + it.count + ' ' + (it.count === 1 ? 'syllable' : 'syllables') + ' (' + (it.syllables || []).join(' \u00b7 ') + ')';
    if (activity === 'syllable_blending') return it.word + ' \u2014 Say: ' + (it.syllables || []).join(' \u00b7 ');
    if (activity === 'manipulation') return it.answer + ' \u2014 Prompt: ' + it.prompt;
    if (activity === 'decoding') return it.word;
    if (activity === 'read_sentence') return it.answer + ' \u2014 "' + it.before + it.answer + it.after + '"';
    if (activity === 'read_passage') return it.answer + ' (Fluency reading check)';
    return it.word;
  }
  function buildWordSoundsWorksheetHtml(input, rawOptions = {}) {
    const src = input && typeof input === 'object' ? input : {};
    const opts = rawOptions && typeof rawOptions === 'object' ? rawOptions : {};
    const lesson = src.lesson && typeof src.lesson === 'object' ? src.lesson : (Array.isArray(src.blocks) ? src : null);
    const blocks = (Array.isArray(src.blocks) && src.blocks.length ? src.blocks : null)
      || (lesson && Array.isArray(lesson.blocks) && lesson.blocks.length ? lesson.blocks : null);
    const imagesMap = src.images || (lesson && lesson.images) || {};
    const title = String(opts.title || src.title || (lesson && lesson.title) || 'Word Sounds Activity Worksheet').trim() || 'Word Sounds Activity Worksheet';
    const picturesOn = opts.pictures !== undefined ? !!opts.pictures : (src.pictures !== undefined ? !!src.pictures : (opts.includePictures !== undefined ? !!opts.includePictures : true));
    const answerKeyOn = opts.answerKey !== undefined ? !!opts.answerKey : true;
    const hintsOn = opts.hints !== undefined ? !!opts.hints : true;
    const syllablesOn = opts.syllables !== undefined ? !!opts.syllables : !!src.syllables;
    const tracingCase = opts.tracing || src.tracing || (src.sessionConfig && src.sessionConfig.tracingCases) || 'both';
    const defaultMatcher = root && (root.AlloWordPictureMatcher || (root.AlloModules && root.AlloModules.WordPictureMatcher)) || null;
    const symbols = opts.symbols !== undefined ? opts.symbols : (src.symbols || (root && root.AlloModules && root.AlloModules.WordSoundsSymbols) || null);
    const matcher = opts.matcher !== undefined ? opts.matcher : (src.matcher !== undefined ? src.matcher : defaultMatcher);
    const ownMap = (opts.own && typeof opts.own === 'object' && typeof opts.own !== 'function') ? opts.own
      : (src.own && typeof src.own === 'object' && typeof src.own !== 'function' ? src.own : null);
    const creditLine = typeof opts.creditLine === 'function' ? opts.creditLine : (root && root.AlloPacketMyWords && root.AlloPacketMyWords.creditLine);
    const ctx = { core: opts.core || src.core || null, dictionary: opts.dictionary || src.dictionary || null, tracing: tracingCase };

    const rawWordList = Array.isArray(src.wsPreloadedWords) && src.wsPreloadedWords.length ? src.wsPreloadedWords
      : (Array.isArray(src.data) && src.data.length ? src.data
        : (Array.isArray(src.items) && src.items.length ? src.items
          : (Array.isArray(src.words) ? src.words : [])));
    const allWordStrings = rawWordList.map(e => typeof e === 'string' ? e.trim() : String((e && (e.word || e.targetWord || e.term)) || '').trim()).filter(Boolean);

    const sections = [];
    if (blocks && blocks.length) {
      blocks.forEach(block => {
        if (!block || !Array.isArray(block.items) || !block.items.length) return;
        const act = String(block.activity || 'mapping');
        const meta = WS_ACT_META[act] || { label: act.replace(/_/g, ' '), directions: 'Complete each item below.' };
        const bWords = block.items.map(it => String((it && (it.word || it.target)) || '').trim()).filter(Boolean);
        let items = block.items.map(it => _wsSynthesizeItem(act, it, bWords.length ? bWords : allWordStrings, ctx));
        if (act === 'letter_tracing') {
          const seenLt = Object.create(null);
          items = items.filter(it => { const k = it.parts.map(p => p.letter).join(''); if (seenLt[k]) return false; seenLt[k] = true; return true; });
        }
        sections.push({ activity: act, label: meta.label, directions: meta.directions, items });
      });
    } else if (rawWordList.length) {
      const actList = (Array.isArray(opts.activities) && opts.activities.length ? opts.activities : null)
        || (Array.isArray(src.activities) && src.activities.length ? src.activities : null)
        || (Array.isArray(src.lessonPlanSequence) && src.lessonPlanSequence.length ? src.lessonPlanSequence : null)
        || WS_ACT_DEFAULTS;
      actList.forEach(actId => {
        const act = String(actId || '').trim();
        if (!act) return;
        const meta = WS_ACT_META[act] || { label: act.replace(/_/g, ' '), directions: 'Complete each item below.' };
        let items = rawWordList.map(entry => _wsSynthesizeItem(act, entry, allWordStrings, ctx)).filter(it => it.word);
        if (act === 'letter_tracing') {
          const seenLt = Object.create(null);
          items = items.filter(it => { const k = it.parts.map(p => p.letter).join(''); if (seenLt[k]) return false; seenLt[k] = true; return true; });
        }
        if (items.length) sections.push({ activity: act, label: meta.label, directions: meta.directions, items });
      });
    }

    const picMap = Object.create(null);
    const symReady = !!(symbols && typeof symbols.get === 'function' && (typeof symbols.ready !== 'function' || symbols.ready()));
    const resolveWordPic = (word, rawEntry) => {
      if (!picturesOn) return null;
      const clean = String(word || '').trim();
      const low = clean.toLowerCase();
      if (!low) return null;
      if (Object.prototype.hasOwnProperty.call(picMap, low)) return picMap[low];
      const ownE = _wsOwnEntry(ownMap, clean);
      if ((rawEntry && rawEntry.pictureNone) || (ownE && ownE.picture && ownE.picture.none)) { picMap[low] = null; return null; }
      if (ownE && ownE.picture && _wsIsPic(ownE.picture.dataUri)) {
        picMap[low] = { uri: ownE.picture.dataUri, set: 'own', credit: ownE.picture.credit || null };
        return picMap[low];
      }
      const emb = rawEntry && (_wsSafeImg(rawEntry.wordPicture, imagesMap) || _wsSafeImg(rawEntry.image, imagesMap) || _wsSafeImg(rawEntry.picture, imagesMap));
      if (emb) {
        const cred = rawEntry.imageCredit || (rawEntry.picture && rawEntry.picture.credit) || rawEntry.imageAttribution || null;
        picMap[low] = { uri: emb, set: cred ? 'own' : 'mulberry', credit: typeof cred === 'object' ? cred : null, creditText: typeof cred === 'string' ? cred : '' };
        return picMap[low];
      }
      const symHit = symbols && typeof symbols.get === 'function'
        ? (symbols.has && symbols.has(clean) ? symbols.get(clean) : (symbols.has && symbols.has(low) ? symbols.get(low) : symbols.get(low)))
        : null;
      if (symHit && symHit.svg) {
        picMap[low] = { uri: _wsSvgUri(symHit.svg), set: symHit.set || 'mulberry', credit: null };
        return picMap[low];
      }
      if (matcher && typeof matcher.matchWord === 'function') {
        let matched = null;
        try { matched = matcher.matchWord({ word: clean, definition: (rawEntry && rawEntry.definition) || '' }, { symbols: symReady ? symbols : null, preferDiagrams: true }); } catch (_) { matched = null; }
        if (matched && matched.svg) {
          picMap[low] = { uri: _wsSvgUri(matched.svg), set: matched.set || (matched.matchTier === 'diagram' || matched.matchType === 'diagram' ? 'diagram' : 'mulberry'), credit: null };
          return picMap[low];
        }
      }
      picMap[low] = null;
      return null;
    };

    const usedWords = [], usedPics = Object.create(null);
    const picTag = (word, rawEntry, neutralAlt, small) => {
      const p = resolveWordPic(word, rawEntry);
      if (!p || !p.uri) return '';
      const k = String(word || '').trim().toLowerCase();
      if (!usedPics[k]) { usedPics[k] = p; usedWords.push(k); }
      return '<img class="' + (small ? 'ws-pic-sm' : 'ws-pic') + '" src="' + escHtml(p.uri) + '" alt="' + escHtml(neutralAlt || word) + '">';
    };

    const keyBlocks = [];
    const sectionsHtml = sections.map(sec => {
      const act = sec.activity;
      const allowSyl = !WS_ACT_NO_SYL[act];
      const fmt = (txt, okSyl = allowSyl) => _wsFmtSyl(txt, syllablesOn && okSyl);

      if (act === 'sound_sort') {
        const boards = _wsBuildSortBoards(sec.items);
        const sortKeyLines = [];
        const boardsHtml = boards.map((b, bIdx) => {
          const bankHtml = '<div class="ws-sort-bank"><span class="ws-bank-label">Word bank:</span>' + b.bank.map(w => '<span class="ws-chip">' + picTag(w, null, '', true) + '<span>' + fmt(w, true) + '</span></span>').join('') + '</div>';
          const colClass = b.columns.length >= 3 ? 'ws-sort-cols ws-sort-cols-3' : 'ws-sort-cols ws-sort-cols-2';
          const colsHtml = '<div class="' + colClass + '">' + b.columns.map(col => {
            const lineN = Math.max(4, col.words.length + 1);
            let linesHtml = '';
            for (let li = 0; li < lineN; li++) linesHtml += '<div class="ws-sort-line"></div>';
            sortKeyLines.push(col.heading + ': ' + (col.words.length ? col.words.join(', ') : '(none)'));
            return '<div class="ws-sort-col"><h4 class="ws-sort-col-head">' + escHtml(col.heading) + '</h4>' + linesHtml + '</div>';
          }).join('') + '</div>';
          return '<div class="ws-sort-board" data-sort-board="' + (bIdx + 1) + '">' + bankHtml + colsHtml + '</div>';
        }).join('');
        keyBlocks.push({ heading: sec.label, lines: sortKeyLines });
        return '<section class="ws-section" data-activity="sound_sort"><div class="ws-section-head"><h2 class="ws-section-title">' + escHtml(sec.label) + '</h2><p class="ws-directions">' + escHtml(sec.directions) + '</p></div>' + boardsHtml + '</section>';
      }

      const secKeyLines = [];
      const itemsHtml = sec.items.map((it, idx) => {
        const n = idx + 1;
        const neutralAlt = 'Picture clue ' + n;
        let inner = '';
        if (act === 'mapping') {
          const pic = picTag(it.word, it.item, neutralAlt, false);
          let boxes = '';
          for (let bi = 0; bi < it.soundCount; bi++) boxes += '<span class="ws-box"></span>';
          const bank = hintsOn && it.bank && it.bank.length
            ? '<div class="ws-bank"><span class="ws-bank-label">Letter bank:</span>' + it.bank.map(g => '<span class="ws-chip">' + escHtml(g) + '</span>').join('') + '</div>'
            : '';
          inner = '<div class="ws-row">' + pic + '<div class="ws-boxes" data-sound-boxes="' + it.soundCount + '">' + boxes + '</div></div>' + bank;
        } else if (act === 'missing_letter') {
          const pic = picTag(it.word, it.item, neutralAlt, false);
          const mlWord = '<div class="ws-missing">' + it.letters.map((ch, ci) => ci === it.hiddenIndex ? '<span class="ws-blank" aria-label="missing letter"></span>' : '<span>' + escHtml(ch) + '</span>').join('') + '</div>';
          const choices = '<ul class="ws-choices">' + (it.choices || []).map(c => '<li class="ws-choice">' + escHtml(c) + '</li>').join('') + '</ul>';
          inner = '<div class="ws-row">' + pic + mlWord + '</div>' + choices;
        } else if (act === 'word_scramble') {
          const pic = picTag(it.word, it.item, neutralAlt, false);
          const tiles = '<div class="ws-tiles">' + (it.tiles || []).map(t => '<span class="ws-tile">' + escHtml(t) + '</span>').join('') + '</div>';
          inner = '<div class="ws-row">' + pic + tiles + '</div><div class="ws-line"></div>';
        } else if (act === 'counting') {
          const pic = picTag(it.word, it.item, '', false);
          const bubbles = '<ul class="ws-bubbles">' + (it.values || ['1', '2', '3', '4', '5', '6']).map(v => '<li class="ws-bubble">' + escHtml(v) + '</li>').join('') + '</ul>';
          inner = '<div class="ws-row">' + pic + '<span class="ws-word">' + fmt(it.word) + '</span></div>' + bubbles;
        } else if (act === 'isolation') {
          const pic = picTag(it.word, it.item, '', false);
          const choices = '<ul class="ws-choices">' + (it.choices || []).map(c => '<li class="ws-choice">' + escHtml(_wsSoundLabel(c)) + '</li>').join('') + '</ul>';
          inner = '<p class="ws-prompt">What is the ' + escHtml(it.positionName) + ' sound in ' + fmt(it.word) + '?</p><div class="ws-row">' + pic + '<span class="ws-word">' + fmt(it.word) + '</span></div>' + choices;
        } else if (act === 'segmentation') {
          const pic = picTag(it.word, it.item, '', false);
          let dots = '';
          for (let di = 0; di < it.slotCount; di++) dots += '<span class="ws-tap-dot"></span>';
          const bank = hintsOn && it.chips && it.chips.length
            ? '<div class="ws-bank"><span class="ws-bank-label">Sound bank:</span>' + it.chips.map(s => '<span class="ws-chip">' + escHtml(_wsSoundLabel(s)) + '</span>').join('') + '</div>'
            : '';
          inner = '<div class="ws-row">' + pic + '<span class="ws-word">' + fmt(it.word) + '</span><div class="ws-tap-dots" data-tap-dots="' + it.slotCount + '">' + dots + '</div></div><div class="ws-line"></div>' + bank;
        } else if (act === 'blending') {
          const seq = '<div class="ws-sounds-seq">' + (it.sounds || []).map(_wsSoundLabel).map(escHtml).join(' \u00b7 ') + '</div>';
          const choices = it.choices && it.choices.length ? '<ul class="ws-choices">' + it.choices.map(c => '<li class="ws-choice">' + fmt(c) + '</li>').join('') + '</ul>' : '';
          inner = seq + '<div class="ws-line"></div>' + choices;
        } else if (act === 'rhyming') {
          const pic = picTag(it.word, it.item, '', false);
          const choices = '<ul class="ws-choices">' + (it.choices || []).map(c => '<li class="ws-choice">' + picTag(c, null, '', true) + '<span>' + fmt(c) + '</span></li>').join('') + '</ul>';
          inner = '<p class="ws-prompt">Circle the word that rhymes with ' + fmt(it.word) + ':</p><div class="ws-row">' + pic + '<span class="ws-word">' + fmt(it.word) + '</span></div>' + choices;
        } else if (act === 'word_families') {
          const pic = picTag(it.word, it.item, '', false);
          const choices = it.chips && it.chips.length ? '<ul class="ws-choices">' + it.chips.map(c => '<li class="ws-choice">' + fmt(c.text) + '</li>').join('') + '</ul>' : '';
          const builds = '<div class="ws-build-lines">'
            + '<span class="ws-build-slot"><span class="ws-build-blank"></span><span>' + escHtml(it.rime) + '</span></span>'
            + '<span class="ws-build-slot"><span class="ws-build-blank"></span><span>' + escHtml(it.rime) + '</span></span>'
            + '<span class="ws-build-slot"><span class="ws-build-blank"></span><span>' + escHtml(it.rime) + '</span></span></div>';
          inner = '<p class="ws-prompt">Word family: -' + escHtml(it.rime) + ' (like ' + fmt(it.word) + ')</p><div class="ws-row">' + pic + '<span class="ws-word">-' + escHtml(it.rime) + '</span></div>' + choices + builds;
        } else if (act === 'letter_tracing') {
          const pic = picTag(it.word, it.item, '', false);
          const rows = (it.parts || []).map(part => {
            let guides = '';
            for (let gi = 0; gi < 3; gi++) guides += '<span class="ws-trace-letter">' + escHtml(part.letter) + '</span>';
            return '<div class="ws-trace-row" data-trace-case="' + escHtml(part.kind || 'letter') + '">' + guides + '</div>';
          }).join('');
          inner = '<div class="ws-row">' + pic + '<p class="ws-prompt">Trace ' + escHtml(it.parts.map(p => p.letter).join(' and ')) + ' (for ' + escHtml(it.word) + ')</p></div><div class="ws-trace-wrap">' + rows + '</div>';
        } else if (act === 'orthography' || act === 'spelling_bee') {
          const pic = picTag(it.word, it.item, neutralAlt, false);
          let scaffold = '';
          if (hintsOn) {
            const sCnt = it.lengthHint ? it.word.length : it.soundCount;
            let boxes = '';
            for (let sbi = 0; sbi < sCnt; sbi++) boxes += '<span class="ws-box"></span>';
            scaffold += '<div class="ws-boxes" data-sound-boxes="' + sCnt + '">' + boxes + '</div>';
            if (it.letterBank && it.letterBank.length) {
              scaffold += '<div class="ws-bank"><span class="ws-bank-label">Letters:</span>' + it.letterBank.map(l => '<span class="ws-chip">' + escHtml(l) + '</span>').join('') + '</div>';
            }
          }
          inner = '<p class="ws-prompt">Listen to your teacher and write word #' + n + ':</p><div class="ws-row">' + pic + scaffold + '</div><div class="ws-line"></div>';
        } else if (act === 'syllable_counting') {
          const pic = picTag(it.word, it.item, '', false);
          const bubbles = '<ul class="ws-bubbles">' + (it.values || ['1', '2', '3', '4', '5']).map(v => '<li class="ws-bubble">' + escHtml(v) + '</li>').join('') + '</ul>';
          inner = '<div class="ws-row">' + pic + '<span class="ws-word ws-no-syl">' + escHtml(it.word) + '</span></div><div class="ws-scoops" aria-hidden="true"><span class="ws-scoop"></span><span class="ws-scoop"></span><span class="ws-scoop"></span></div>' + bubbles;
        } else if (act === 'syllable_blending') {
          const seq = '<div class="ws-sounds-seq">' + (it.syllables || []).map(escHtml).join(' \u00b7 ') + '</div>';
          const choices = it.choices && it.choices.length ? '<ul class="ws-choices">' + it.choices.map(c => '<li class="ws-choice">' + fmt(c) + '</li>').join('') + '</ul>' : '';
          inner = seq + '<div class="ws-line"></div>' + choices;
        } else if (act === 'manipulation') {
          const choices = it.choices && it.choices.length ? '<ul class="ws-choices">' + it.choices.map(c => '<li class="ws-choice">' + fmt(c) + '</li>').join('') + '</ul>' : '';
          inner = '<p class="ws-prompt">' + escHtml(it.prompt) + '</p><div class="ws-line"></div>' + choices;
        } else if (act === 'decoding') {
          const checks = '<div class="ws-fluency"><span class="ws-check-item"><span class="ws-checkbox"></span> Read aloud</span><span class="ws-check-item"><span class="ws-checkbox"></span> Read smoothly</span></div>';
          const pics = it.choices && it.choices.length
            ? '<ul class="ws-choices">' + it.choices.map(c => {
                const img = picTag(c.text, c.image ? { image: c.image } : null, 'Picture choice', true);
                return '<li class="ws-choice">' + (img || escHtml(c.text)) + '</li>';
              }).join('') + '</ul>'
            : '';
          inner = '<div class="ws-row"><span class="ws-word">' + fmt(it.word) + '</span></div>' + checks + pics;
        } else if (act === 'read_sentence') {
          const pic = picTag(it.word, it.item, neutralAlt, false);
          const sent = '<p class="ws-prompt">' + fmt(it.before) + '<span class="ws-blank" aria-label="blank"></span>' + fmt(it.after) + '</p>';
          const choices = '<ul class="ws-choices">' + (it.options || []).map(c => '<li class="ws-choice">' + fmt(c) + '</li>').join('') + '</ul>';
          const flu = '<div class="ws-fluency"><span class="ws-check-item"><span class="ws-checkbox"></span> Read the completed sentence aloud</span></div>';
          inner = '<div class="ws-row">' + pic + '<div>' + sent + choices + flu + '</div></div>';
        } else if (act === 'read_passage') {
          const pass = '<div class="ws-passage">' + (it.lines || []).map(ln => (ln.before != null || ln.after != null) ? '<p>' + fmt(ln.before) + '<span class="ws-blank" aria-label="blank"></span>' + fmt(ln.after) + '</p>' : '<p>' + fmt(ln.text) + '</p>').join('') + '</div>';
          const flu = '<div class="ws-fluency"><span class="ws-check-item"><span class="ws-checkbox"></span> 1st read</span><span class="ws-check-item"><span class="ws-checkbox"></span> 2nd read</span><span class="ws-check-item"><span class="ws-checkbox"></span> 3rd read</span></div>';
          const choices = it.options && it.options.length ? '<ul class="ws-choices">' + it.options.map(c => '<li class="ws-choice">' + fmt(c) + '</li>').join('') + '</ul>' : '<div class="ws-line"></div>';
          inner = pass + flu + choices;
        } else {
          const pic = picTag(it.word, it.item, '', false);
          inner = '<div class="ws-row">' + pic + '<span class="ws-word">' + fmt(it.word) + '</span></div><div class="ws-line"></div>';
        }
        secKeyLines.push(_wsKeyLine(act, it));
        return '<li class="ws-item"><span class="ws-num">' + n + '.</span><div class="ws-body">' + inner + '</div></li>';
      }).join('');
      keyBlocks.push({ heading: sec.label, lines: secKeyLines });
      return '<section class="ws-section" data-activity="' + escHtml(act) + '"><div class="ws-section-head"><h2 class="ws-section-title">' + escHtml(sec.label) + '</h2><p class="ws-directions">' + escHtml(sec.directions) + '</p></div><ol class="ws-list">' + itemsHtml + '</ol></section>';
    }).join('\n');

    const setsUsed = [];
    const creditLines = [];
    usedWords.forEach(w => {
      const p = usedPics[w];
      if (p && p.set !== 'own' && !setsUsed.includes(p.set)) setsUsed.push(p.set);
    });
    const setOrder = ['mulberry', 'openmoji', 'diagram'];
    setsUsed.sort((a, b) => (setOrder.indexOf(a) < 0 ? 99 : setOrder.indexOf(a)) - (setOrder.indexOf(b) < 0 ? 99 : setOrder.indexOf(b)));
    setsUsed.forEach(set => { const line = _wsSetCredit(symbols, set); if (line) creditLines.push('Pictures: ' + line); });
    usedWords.forEach(w => {
      const p = usedPics[w];
      if (!p || p.set !== 'own') return;
      if (p.creditText) { creditLines.push('Picture for "' + w + '": ' + p.creditText); return; }
      if (p.credit && p.credit.own !== true) {
        const line = typeof creditLine === 'function' ? creditLine(p.credit) : formatCreditValue(getCore(), p.credit);
        if (line) creditLines.push('Picture for "' + w + '": ' + line);
      }
    });
    const creditsHtml = creditLines.length
      ? '<footer class="ws-credits">' + creditLines.map(l => '<p>' + escHtml(String(l).replace(/\b[a-z][a-z0-9+.-]{1,12}:\/\/+/gi, '')) + '</p>').join('') + '</footer>'
      : '';

    const keyHtml = answerKeyOn && keyBlocks.length
      ? '<section class="ws-key" aria-label="Teacher answer key"><p class="ws-key-banner">' + escHtml(WS_ACT_KEY_NOTICE) + '</p><h2>Teacher Answer Key &amp; Read-Aloud List</h2>'
        + keyBlocks.map(kb => '<h3>' + escHtml(kb.heading) + '</h3><ol class="ws-key-list">' + kb.lines.map(l => '<li>' + escHtml(l) + '</li>').join('') + '</ol>').join('') + '</section>'
      : '';

    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<meta http-equiv="Content-Security-Policy" content="' + WS_ACT_CSP + '">',
      '<meta name="referrer" content="no-referrer">',
      '<title>' + escHtml(title) + ' \u2014 Activity Worksheet</title>',
      '<style>' + WS_ACT_CSS + '</style>',
      '</head>',
      '<body>',
      '<p class="ws-noprint">Print from your browser menu (Ctrl+P or Cmd+P). Keep the scale at 100%.</p>',
      '<header class="ws-header">',
      '<h1 class="ws-title">' + escHtml(title) + '</h1>',
      '<div class="ws-meta"><span class="ws-meta-field"><span>Name:</span><span class="ws-meta-line"></span></span><span class="ws-meta-field"><span>Date:</span><span class="ws-meta-line"></span></span></div>',
      '</header>',
      sectionsHtml || '<p>No worksheet items are available yet.</p>',
      creditsHtml,
      keyHtml,
      '</body>',
      '</html>',
    ].join('\n');
  }
  root.AlloWordPracticeMedia = { prepareAudio, buildPptx, buildPictureSlidesPptx, buildFlashcardsHtml, buildFrayerHtml, buildSortingCardsHtml, buildWorksheetHtml, buildWordSoundsWorksheetHtml, buildBingoHtml, buildLoopGameHtml, buildWordWallHtml, everyDeviceAudio, needsEveryDeviceAudio, ensureSyllableTableLoaded, applySheetReadingSupports };
})(typeof window !== 'undefined' ? window : globalThis);
