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
  async function portableAudio(source, context) {
    const core = getCore(), direct = core.safeAudio(source);
    if (direct) return direct;
    if (typeof source !== 'string' || !/^(blob:|https?:\/\/)/i.test(source)) return '';
    checkAbort(context);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (context.signal) context.signal.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, 15000);
    try {
      const response = await (context.fetch || root.fetch)(source, { signal: controller.signal });
      if (!response.ok) throw new Error('The audio clip could not be downloaded.');
      const maxBytes = Math.floor(core.LIMITS.audioChars * 0.74);
      if (Number(response.headers.get('content-length')) > maxBytes) throw new Error('The audio clip is too large.');
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
  const legacySoundAliases = { '\u0103': 'a', '\u0115': 'e', '\u012d': 'i', '\u014f': 'o', '\u016d': 'u' };
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
      const loaded = () => { if (root.getAudio('phonemes', 'a')) finish(); };
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
    if (typeof root.loadWordAudioBank === 'function' && pack.items.some(item => !item.wordAudio && defaultEnglish(core.fieldLanguage(item, 'term', pack.language)))) {
      try { await boundedWait(root.loadWordAudioBank(), 6000, 'The word library took too long to respond.', context.signal); }
      catch (error) { if (error.name === 'AbortError') throw error; }
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
            for (const source of wordBankSources(root._CACHE_WORD_AUDIO_BANK, wordKey)) {
              const candidate = await portableClip(source, context, language, { source: 'recorded_bank', language: 'en-US', provider: 'kokoro', resolvedVoice: 'af_heart' });
              if (candidate.status === 'stale-language') noteMismatch(item, candidate, false);
              else if (candidate.audio) { clip = candidate; break; }
            }
          }
          if (!clip && !ttsUnavailable && typeof context.callTTS === 'function') {
            const voice = context.selectedVoice || undefined;
            let resolvedProfile = null;
            const source = await boundedWait(context.callTTS(item.word, voice, typeof context.ttsSpeed === 'number' ? context.ttsSpeed : undefined, {
              language,
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
    if (!buffers.length) return '';
    const sampleRate = buffers[0].sampleRate;
    if (buffers.some(buffer => buffer.sampleRate !== sampleRate)) throw new Error('Sound clips use incompatible sample rates.');
    const gap = Math.round(sampleRate * gapSeconds);
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
      slide.addText(label.map((part, index) => ({ text: (index ? ' · ' : '') + part.text, options: textLanguage(part.language) })), { x: 0.55, y: 6.96, w: 12.2, h: 0.25, fontSize: 12, color: appearance.muted, margin: 0, ...textLanguage(label[0].language) });
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
      const colors = { yellow: 'FEF08A', blue: '93C5FD', green: '86EFAC', pink: 'F9A8D4', purple: 'D8B4FE', red: 'DC2626', black: '111827' };
      const stickers = { star: '⭐', check: '✅', idea: '💡', love: '❤️', question: '❓', important: '❗', fire: '🔥', target: '🎯', thumbsup: '👍', party: '🎉', rocket: '🚀', flag: '🚩' };
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
      else if (type === 'jpeg') {
        for (let i = 2; i + 9 < bytes.length;) {
          if (at(i) !== 0xff) { i++; continue; }
          const marker = at(i + 1);
          if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { i += marker === 0xff ? 1 : 2; continue; }
          if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) { size = { w: (at(i + 7) << 8) | at(i + 8), h: (at(i + 5) << 8) | at(i + 6) }; break; }
          i += 2 + ((at(i + 2) << 8) | at(i + 3));
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
        if (options.mode === 'sentence') {
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
    pack.items.forEach(item => { count(item.wordAudio); (item.phonemes || []).forEach(sound => count(sound.audio)); });
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
    const items = pack.items.map(item => ({ ...item, wordAudio: swap(item.wordAudio), phonemes: (item.phonemes || []).map(sound => ({ ...sound, audio: swap(sound.audio) })) }));
    return { pack: { ...pack, items }, ...report };
  }
  // True when a clip would be converted, so a set with only WAV/MP3 (or no
  // sounds) still downloads at once, inside the click.
  function needsEveryDeviceAudio(input) {
    try {
      const pack = getCore().normalizeInput(input);
      const convertible = value => typeof value === 'string' && /^data:audio\//i.test(value) && !EVERY_DEVICE_AUDIO.test(value);
      return pack.items.some(item => convertible(item.wordAudio) || (item.phonemes || []).some(sound => convertible(sound.audio)));
    } catch (_) { return false; }
  }
  root.AlloWordPracticeMedia = { prepareAudio, buildPptx, everyDeviceAudio, needsEveryDeviceAudio };
})(typeof window !== 'undefined' ? window : globalThis);
