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
    const coverage = core.audioCoverage(pack), incomplete = coverage.words < coverage.totalWords || coverage.phonemes < coverage.totalPhonemes;
    pack.audioStatus = { ...coverage, errors: [...new Set(errors)], message: incomplete ? 'Some recordings are unavailable. Available clips were kept.' : 'All word and prepared sound recordings are ready.' };
    return pack;
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
    const appearance = core.cardAppearance(options), textScale = appearance.textScale;
    const fontWidth = options.cardFont === 'verdana' ? 1.12 : options.cardFont === 'georgia' ? 1.08 : 1;
    const sourceLanguage = core.languageInfo(pack.language);
    const itemLanguage = (item, field) => core.languageInfo(core.fieldLanguage(item, field, pack.language));
    const uiLanguage = core.languageInfo(context.currentUiLanguage || context.uiLanguage || '');
    // PptxGenJS reads language from text options, not presentation.lang/theme.
    // "und" prevents its English default from mislabelling unknown languages.
    const textLanguage = info => ({ lang: info.tag || 'und', rtlMode: info.dir === 'rtl' });
    const localized = (name, fallback, params = {}) => {
      const key = 'word_practice.' + name;
      let value = context.labels && context.labels[name];
      if (typeof value !== 'string' || !value || value === key) {
        try { value = typeof context.t === 'function' ? context.t(key) : ''; } catch (_) { value = ''; }
      }
      const translated = typeof value === 'string' && value && value !== key && value !== fallback;
      let text = translated ? value : fallback;
      Object.keys(params).forEach(key => { text = text.split('{' + key + '}').join(String(params[key])); });
      return { text, language: translated ? uiLanguage : core.languageInfo('English') };
    };
    const L = (name, fallback, params) => localized(name, fallback, params).text;
    const uiText = (slide, name, fallback, box, params) => {
      const label = localized(name, fallback, params);
      const fontSize = box.fontSize > 20 ? fittedFont(label.text, box, box.fontSize) : box.fontSize;
      slide.addText(label.text, { ...box, fontFace: appearance.fontFace, fontSize, ...textLanguage(label.language) });
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
      const longest = Math.max(...word.split(/\s+/).map(part => part.length));
      let fontSize = Math.max(19, Math.min(100 * textScale * (Number(card.scale) || 1), (corner ? 580 : 1080) / Math.max(6, longest) / fontWidth));
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
      slide.addText(word, { ...box, fontFace: appearance.fontFace, fontSize, bold: true, color: appearance.heading, align: 'center', valign: 'mid', margin: 0.05, breakLine: false, ...textLanguage(itemLanguage(item, 'term')) });
    }
    async function addAudio(slide, item) {
      if (!options.includeAudio) return;
      let word = '', sounds = '';
      if (item.wordAudio) {
        try { word = await wordMedia(item.wordAudio); }
        catch (_) { warnings.add(L('pptx_word_audio_failed', 'Word audio for “{word}” could not be converted for PowerPoint.', { word: item.word })); }
      } else warnings.add(L('pptx_word_audio_missing', 'No word recording is included for “{word}”.', { word: item.word }));
      if (item.phonemes.length) {
        if (item.phonemes.some(sound => !sound.audio)) warnings.add(L('pptx_sounds_incomplete', 'The sound sequence for “{word}” is incomplete and was not included.', { word: item.word }));
        else try { sounds = await soundsMedia(item); } catch (_) { warnings.add(L('pptx_sounds_failed', 'The sound sequence for “{word}” could not be converted for PowerPoint.', { word: item.word })); }
      }
      checkAbort(context);
      [[word, 'hear_word', 'Hear word'], [sounds, 'hear_sounds', 'Hear sounds']].forEach(([source, name, label], index) => {
        if (!source) return;
        const x = 0.75 + index * 2.5;
        // PptxGenJS expects an extension-bearing audio MIME and base64 payload.
        const data = source.replace(/^data:audio\/(mpeg|mp3);/i, 'audio/mp3;').replace(/^data:audio\/(x-wav|wave|wav);/i, 'audio/wav;');
        slide.addMedia({ type: 'audio', data, x, y: 6.03, w: 0.48, h: 0.48 });
        uiText(slide, name, label, { x: x + 0.58, y: 6.06, w: 1.8, h: 0.3, fontSize: 14, color: appearance.accent, margin: 0, fit: 'shrink' });
      });
    }
    let textSegments = null;
    try { if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') textSegments = new Intl.Segmenter(undefined, { granularity: 'grapheme' }); } catch (_) {}
    // Sentence pages preserve authored whitespace and whole graphemes. The
    // conservative line budget leaves room for font substitution in PowerPoint.
    const sentenceSegments = value => {
      if (textSegments) return Array.from(textSegments.segment(value), part => ({ text: part.segment, index: part.index }));
      // Older browsers still keep common combining marks, emoji modifiers,
      // joined emoji and flag pairs together at continuation boundaries.
      const parts = []; let index = 0, regionalCount = 0;
      for (const text of Array.from(value)) {
        const previous = parts[parts.length - 1];
        const regional = /\p{Regional_Indicator}/u.test(text);
        const extending = /[\p{Mark}\u200c\u200d\u{1f3fb}-\u{1f3ff}\u{e0020}-\u{e007f}]/u.test(text);
        const joined = previous && !/[\r\n\t]/.test(previous.text) && !/[\r\n\t]/.test(text) && (extending || previous.text.endsWith('\u200d') || (regional && regionalCount % 2));
        if (joined || (previous && previous.text === '\r' && text === '\n')) previous.text += text;
        else parts.push({ text, index });
        index += text.length; regionalCount = regional ? regionalCount + 1 : 0;
      }
      return parts;
    };
    const sentenceWidth = value => /\s/u.test(value) ? 0.35 : /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}]/u.test(value) ? 1.1 : /[A-ZMW]/.test(value) ? 0.85 : /^[\x00-\x7f]/.test(value) ? 0.65 : 0.9;
    function sentenceTextPages(value, maxLines = Math.max(3, Math.floor(9 / textScale)), maxWidth = 26 / textScale / fontWidth) {
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
      slide.addText(text, { x: 0.85, y: 1.0, w: 11.65, h: 5.5, fontFace: appearance.fontFace, fontSize: 28 * textScale, color: choices ? appearance.accent : appearance.heading, align: language.dir === 'rtl' ? 'right' : 'left', valign: 'top', margin: 0.1, paraSpaceAfterPt: 0, ...textLanguage(language) });
    }
    // Estimate word wrapping as well as explicit line breaks. Keep each source
    // character in exactly one line, including spaces and joined graphemes.
    function readableTextLines(value, maxWidth) {
      const lines = []; let start = 0, width = 0;
      for (const token of value.matchAll(/\r\n|[\r\n]|[^\S\r\n]+|[^\s]+/gu)) {
        const parts = sentenceSegments(token[0]);
        const tokenWidth = parts.reduce((sum, part) => sum + sentenceWidth(part.text), 0);
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
          const size = sentenceWidth(part.text);
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
    const vocabularyWidth = 27 / textScale / fontWidth, vocabularyBudget = 6.8 / textScale;
    const vocabularyLineLimit = Math.max(2, Math.floor(vocabularyBudget - 0.4));
    function vocabularyParts(section) {
      const labelLength = section.label ? section.label.text.length : 0;
      const value = (section.label ? section.label.text : '') + section.text;
      const lines = readableTextLines(value, vocabularyWidth), parts = [];
      let offset = 0;
      for (let index = 0; index < lines.length;) {
        let count = Math.min(vocabularyLineLimit, lines.length - index);
        // Avoid leaving a single content line on a continuation page.
        if (lines.length - index - count === 1 && lines[lines.length - 1]) count--;
        // A trailing newline creates another visible line in PowerPoint.
        if (count === vocabularyLineLimit && /[\r\n]$/.test(lines[index + count - 1])) count--;
        const text = lines.slice(index, index + count).join(''); index += count;
        if (!text) continue;
        const labelEnd = Math.min(labelLength, offset + text.length);
        const part = { ...section, text: value.slice(Math.max(offset, labelLength), offset + text.length),
          label: offset < labelLength ? { ...section.label, text: value.slice(offset, labelEnd) } : null,
          weight: readableTextLines(text, vocabularyWidth).length + 0.4 };
        parts.push(part); offset += text.length;
      }
      return parts;
    }
    function vocabularyHeading(slide, item) {
      // Pasted line breaks are whitespace within a term, not forced title rows.
      const heading = item.word.replace(/\s+/gu, ' ');
      let fontSize = 48 * textScale;
      while (fontSize > 12 && readableTextLines(heading, 11.7 * 72 / fontSize / fontWidth).length * fontSize * 1.35 > 1.05 * 72) fontSize = Math.max(12, fontSize - 1);
      slide.addText(heading, { x: 0.8, y: 0.92, w: 11.7, h: 1.05, fontFace: appearance.fontFace, fontSize, color: appearance.heading, bold: true, align: 'center', valign: 'mid', margin: 0, ...textLanguage(itemLanguage(item, 'term')) });
    }
    function vocabularyPages(item) {
      const sections = [];
      if (item.definition) sections.push({ text: item.definition, language: itemLanguage(item, 'definition') });
      if (item.example) sections.push({ text: item.example, language: itemLanguage(item, 'example'), label: localized('pptx_example', 'Example: ') });
      item.translations.forEach(value => {
        const label = core.languageLabel(value.language, context.currentUiLanguage || context.uiLanguage || 'English');
        // A dedicated label line keeps opposite writing directions from
        // joining or moving the separator across the translated passage.
        sections.push({ text: value.text, language: core.languageInfo(value.language), label: value.language ? { ...label, text: label.text + ':\n', separateLine: true } : null });
      });
      if (!sections.length) {
        const empty = localized('no_meaning', 'No meaning or example has been prepared for this word.');
        sections.push({ text: empty.text, language: empty.language });
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
        const value = part.label ? [
          { text: part.label.text, options: { ...textLanguage(part.label.language), rtlMode: (part.label.separateLine ? part.label.language : part.language).dir === 'rtl', ...(part.label.separateLine ? { fontSize: 20 * textScale, bold: true, color: appearance.muted } : {}) } },
          { text: part.text, options: textLanguage(part.language) }
        ] : part.text;
        slide.addText(value, { x: 1.0, y, w: 11.3, h, fontFace: appearance.fontFace, fontSize: 26 * textScale, color: appearance.text, align: part.language.dir === 'rtl' ? 'right' : 'left', valign: 'mid', margin: 0.08, paraSpaceAfterPt: 0, ...textLanguage(part.language) });
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
            && sentenceTextPages(activity.prompt, Math.floor(4 / textScale), 22 / textScale / fontWidth).length === 1 && sentenceTextPages(choiceText, Math.floor(4 / textScale), 30 / textScale / fontWidth).length === 1;
          let finalPrompt;
          if (compact) {
            const prompt = finalPrompt = slideBase(footer);
            prompt.addText(activity.prompt, { x: 0.85, y: 1.25, w: 11.65, h: 2.7, fontSize: 34 * textScale, color: appearance.heading, align: 'center', valign: 'mid', margin: 0.1, fit: 'shrink', ...textLanguage(itemLanguage(item, 'sentence')) });
            prompt.addText(choiceText, { x: 1.4, y: 4.05, w: 10.5, h: 1.65, fontSize: 23 * textScale, color: appearance.accent, align: 'center', margin: 0.02, fit: 'shrink', ...textLanguage(itemLanguage(item, 'term')) });
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
          const answer = slideBase(answerFooter()); mainWord(answer, activity.answer, card, item, true); await addAudio(answer, item);
        } else if (options.mode === 'spelling') {
          const prompt = slideBase(footer);
          uiText(prompt, options.includeAudio && item.wordAudio ? 'spell_listen' : 'spell_teacher', options.includeAudio && item.wordAudio ? 'Listen, then spell the word.' : 'Ask your teacher to say the word, then spell it.', { x: 1, y: 2.0, w: 11.3, h: 1.5, fontSize: 44 * textScale, color: appearance.heading, align: 'center', margin: 0, fit: 'shrink' });
          uiText(prompt, 'pptx_spell_advance', 'Advance to check your spelling.', { x: 1, y: 3.8, w: 11.3, h: 0.7, fontSize: 22 * textScale, color: appearance.muted, align: 'center', margin: 0, fit: 'shrink' });
          if (typeof prompt.addNotes === 'function') prompt.addNotes(L('pptx_say_word_note', 'Say this word aloud if needed: {word}', { word: item.word }));
          await addAudio(prompt, item);
          const answer = slideBase(answerFooter()); mainWord(answer, item.word, card, item, true);
        } else if (options.mode === 'vocabulary') {
          const pages = vocabularyPages(item);
          for (let page = 0; page < pages.length; page++) {
            checkAbort(context);
            const slide = slideBase(pages.length > 1 ? [...footer, localized('pptx_part', 'Part {n}/{total}', { n: page + 1, total: pages.length })] : footer);
            vocabularyHeading(slide, item);
            addVocabularyPage(slide, pages[page]);
            if (page === 0) await addAudio(slide, item);
            await sentencePageYield();
          }
        } else {
          const slide = slideBase(footer); mainWord(slide, item.word, card, item, options.mode === 'blend');
          if (options.mode === 'blend') {
            const box = { x: 0.8, y: 4.85, w: 11.7, h: 0.7, fontSize: 30 * textScale, color: appearance.accent, align: 'center', margin: 0, fit: 'shrink' };
            if (item.phonemes.length) { const sounds = item.phonemes.map(sound => sound.label).join('  ·  '); slide.addText(sounds, { ...box, fontFace: appearance.fontFace, fontSize: fittedFont(sounds, box, box.fontSize), ...textLanguage(itemLanguage(item, 'term')) }); }
            else uiText(slide, 'pptx_no_sounds', 'No sound sequence is prepared for this word.', box);
          }
          await addAudio(slide, item);
        }
        if (typeof context.onProgress === 'function') context.onProgress({ completed: index + 1, total: cards.length });
        if ((index + 1) % 10 === 0) { await new Promise(resolve => setTimeout(resolve, 0)); checkAbort(context); }
      }
    } finally { if (audioContext && typeof audioContext.close === 'function') await audioContext.close().catch(() => {}); }
    pptx.wordPracticeWarnings = [...warnings];
    return pptx;
  }
  root.AlloWordPracticeMedia = { prepareAudio, buildPptx };
})(typeof window !== 'undefined' ? window : globalThis);
