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
    const core = getCore(), pack = core.normalizeInput(input), options = core.normalizeOptions(rawOptions);
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
      slide.addText(label.text, { ...box, ...textLanguage(label.language) });
    };
    checkAbort(context);
    if (typeof context.ensurePptx === 'function') await context.ensurePptx();
    const Constructor = context.PptxGenJS || root.PptxGenJS;
    if (typeof Constructor !== 'function') throw new Error(L('pptx_unavailable', 'PowerPoint export is unavailable. Reconnect once to load the PowerPoint exporter, then try again.'));
    const cards = Array.isArray(sequence) ? sequence : core.createSequence(pack, options);
    if (!cards.length) throw new Error(L('need_words', 'Add at least one word to begin.'));
    const pptx = new Constructor();
    pptx.layout = 'LAYOUT_WIDE'; pptx.author = 'AlloFlow'; pptx.subject = 'Classroom word practice'; pptx.title = pack.title;
    pptx.company = 'AlloFlow'; pptx.theme = { headFontFace: 'Arial', bodyFontFace: 'Arial' };
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
      const slide = pptx.addSlide(); slide.background = { color: 'FFFFFF' };
      const title = pack.title === 'Word Fluency Pop-Up' ? localized('mode_popup', 'Word Fluency Pop-Up') : { text: pack.title, language: sourceLanguage };
      slide.addText(title.text, { x: 0.55, y: 0.2, w: 12.2, h: 0.4, fontFace: 'Arial', fontSize: 16, color: '475569', margin: 0, fit: 'shrink', ...textLanguage(title.language) });
      slide.addText(label.map((part, index) => ({ text: (index ? ' · ' : '') + part.text, options: textLanguage(part.language) })), { x: 0.55, y: 6.96, w: 12.2, h: 0.25, fontSize: 12, color: '475569', margin: 0, ...textLanguage(label[0].language) });
      return slide;
    }
    function mainWord(slide, word, card, item, fixed = false) {
      const left = card.position && card.position.endsWith('left'), right = card.position && card.position.endsWith('right');
      const corner = !fixed && (left || right);
      const box = corner ? { x: left ? 0.6 : 6.7, y: card.position.startsWith('top') ? 1.2 : 3.65, w: 6, h: 2.1 } : { x: 0.7, y: 2.0, w: 11.9, h: 2.6 };
      const longest = Math.max(...word.split(/\s+/).map(part => part.length));
      const fontSize = Math.max(19, Math.min(100 * (Number(card.scale) || 1), (corner ? 580 : 1080) / Math.max(6, longest)));
      slide.addText(word, { ...box, fontFace: 'Arial', fontSize, bold: true, color: '172554', align: 'center', valign: 'mid', margin: 0.05, fit: 'shrink', breakLine: false, ...textLanguage(itemLanguage(item, 'term')) });
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
        uiText(slide, name, label, { x: x + 0.58, y: 6.06, w: 1.8, h: 0.3, fontSize: 14, color: '1E3A8A', margin: 0, fit: 'shrink' });
      });
    }
    let textSegments = null;
    try { if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') textSegments = new Intl.Segmenter(undefined, { granularity: 'grapheme' }); } catch (_) {}
    const textBoundary = (value, requested) => {
      if (textSegments) {
        for (const part of textSegments.segment(value)) {
          const next = part.index + part.segment.length;
          if (next === requested) return requested;
          if (next > requested) return part.index || next;
        }
      }
      // Older browsers still keep surrogate pairs intact without Segmenter.
      const before = value.charCodeAt(requested - 1), after = value.charCodeAt(requested);
      return before >= 0xD800 && before <= 0xDBFF && after >= 0xDC00 && after <= 0xDFFF ? requested - 1 : requested;
    };
    const chunks = value => {
      const result = []; let remaining = value;
      while (remaining.length > 650) {
        let end = remaining.lastIndexOf(' ', 650); if (end < 350) end = 650;
        end = textBoundary(remaining, end);
        result.push(remaining.slice(0, end)); remaining = remaining.slice(end).trim();
      }
      if (remaining) result.push(remaining); return result;
    };
    function vocabularyPages(item) {
      const sections = [];
      if (item.definition) sections.push({ text: item.definition, language: itemLanguage(item, 'definition') });
      if (item.example) sections.push({ text: item.example, language: itemLanguage(item, 'example'), label: localized('pptx_example', 'Example: ') });
      item.translations.forEach(value => sections.push({ text: value.text, language: core.languageInfo(value.language), label: value.language ? { text: value.language + ': ', language: { tag: '', dir: 'auto' } } : null }));
      if (!sections.length) {
        const empty = localized('no_meaning', 'No meaning or example has been prepared for this word.');
        sections.push({ text: empty.text, language: empty.language });
      }
      const pages = []; let page = [], length = 0;
      sections.forEach(section => chunks(section.text).forEach((text, index) => {
        const part = { ...section, text, label: index ? null : section.label };
        const size = text.length + (part.label ? part.label.text.length : 0);
        if (page.length && (length + size + 2 > 650 || page.length >= 4)) { pages.push(page); page = []; length = 0; }
        page.push(part); length += size + 2;
      }));
      if (page.length) pages.push(page);
      return pages;
    }
    function addVocabularyPage(slide, paragraphs) {
      const weights = paragraphs.map(part => Math.max(1, Math.ceil((part.text.length + (part.label ? part.label.text.length : 0)) / 65)) + 0.4);
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      let y = 2.15;
      paragraphs.forEach((part, index) => {
        const h = 3.5 * weights[index] / total;
        const value = part.label ? [
          { text: part.label.text, options: { ...textLanguage(part.label.language), rtlMode: part.language.dir === 'rtl' } },
          { text: part.text, options: textLanguage(part.language) }
        ] : part.text;
        slide.addText(value, { x: 1.0, y, w: 11.3, h, fontSize: 26, color: '1E293B', valign: 'mid', margin: 0.08, fit: 'shrink', paraSpaceAfterPt: 14, ...textLanguage(part.language) });
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
          const activity = item.sentenceActivity, prompt = slideBase(footer);
          prompt.addText(activity.prompt, { x: 0.85, y: 1.25, w: 11.65, h: 2.7, fontSize: activity.prompt.length > 500 ? 20 : 34, color: '172554', align: 'center', valign: 'mid', margin: 0.1, fit: 'shrink', ...textLanguage(itemLanguage(item, 'sentence')) });
          prompt.addText(activity.choices.map((choice, n) => String.fromCharCode(65 + n) + '. ' + choice).join('\n'), { x: 1.4, y: 4.05, w: 10.5, h: 1.65, fontSize: 23, color: '1E3A8A', align: 'center', margin: 0.02, fit: 'shrink', ...textLanguage(itemLanguage(item, 'term')) });
          if (typeof prompt.addNotes === 'function') prompt.addNotes(L('pptx_answer_note', 'Answer: {answer}. Advance to reveal.', { answer: activity.answer }));
          const answer = slideBase(answerFooter()); mainWord(answer, activity.answer, card, item, true); await addAudio(answer, item);
        } else if (options.mode === 'spelling') {
          const prompt = slideBase(footer);
          uiText(prompt, options.includeAudio && item.wordAudio ? 'spell_listen' : 'spell_teacher', options.includeAudio && item.wordAudio ? 'Listen, then spell the word.' : 'Ask your teacher to say the word, then spell it.', { x: 1, y: 2.0, w: 11.3, h: 1.5, fontSize: 44, color: '172554', align: 'center', margin: 0, fit: 'shrink' });
          uiText(prompt, 'pptx_spell_advance', 'Advance to check your spelling.', { x: 1, y: 3.8, w: 11.3, h: 0.7, fontSize: 22, color: '475569', align: 'center', margin: 0, fit: 'shrink' });
          if (typeof prompt.addNotes === 'function') prompt.addNotes(L('pptx_say_word_note', 'Say this word aloud if needed: {word}', { word: item.word }));
          await addAudio(prompt, item);
          const answer = slideBase(answerFooter()); mainWord(answer, item.word, card, item, true);
        } else if (options.mode === 'vocabulary') {
          const pages = vocabularyPages(item);
          for (let page = 0; page < pages.length; page++) {
            const slide = slideBase(pages.length > 1 ? [...footer, localized('pptx_part', 'Part {n}/{total}', { n: page + 1, total: pages.length })] : footer);
            slide.addText(item.word, { x: 0.8, y: 0.92, w: 11.7, h: 1.05, fontSize: 48, color: '172554', bold: true, align: 'center', margin: 0, fit: 'shrink', ...textLanguage(itemLanguage(item, 'term')) });
            addVocabularyPage(slide, pages[page]);
            if (page === 0) await addAudio(slide, item);
          }
        } else {
          const slide = slideBase(footer); mainWord(slide, item.word, card, item, options.mode === 'blend');
          if (options.mode === 'blend') {
            const box = { x: 0.8, y: 4.85, w: 11.7, h: 0.7, fontSize: 30, color: '1E3A8A', align: 'center', margin: 0, fit: 'shrink' };
            if (item.phonemes.length) slide.addText(item.phonemes.map(sound => sound.label).join('  ·  '), { ...box, ...textLanguage(itemLanguage(item, 'term')) });
            else uiText(slide, 'pptx_no_sounds', 'No sound sequence is prepared for this word.', box);
          }
          await addAudio(slide, item);
        }
        if (typeof context.onProgress === 'function') context.onProgress({ completed: index + 1, total: cards.length });
      }
    } finally { if (audioContext && typeof audioContext.close === 'function') await audioContext.close().catch(() => {}); }
    pptx.wordPracticeWarnings = [...warnings];
    return pptx;
  }
  root.AlloWordPracticeMedia = { prepareAudio, buildPptx };
})(typeof window !== 'undefined' ? window : globalThis);
