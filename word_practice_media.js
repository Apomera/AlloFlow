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
  // Exact recordings win; these map explicit sound notation and the ai/ea
  // aliases already used by Word Sounds' phoneme voice-pack editor.
  const soundAliases = { '\u0283': 'sh', 't\u0283': 'ch', '\u0292': 'zh', 'd\u0292': 'j', '\u03b8': 'th', '\u00f0': 'dh', '\u014b': 'ng', '\u0259': 'schwa', '\u00e6': 'a', '\u025b': 'e', '\u026a': 'i', '\u028c': 'u', 'e\u026a': 'ay', 'a\u026a': 'ie', 'o\u028a': 'oa', 'a\u028a': 'ow', '\u0254\u026a': 'oy', 'u\u02d0': 'oo', '\u028a': 'oo_short', '\u0101': 'ay', '\u0113': 'ee', '\u012b': 'ie', '\u014d': 'oa', '\u0103': 'a', '\u0115': 'e', '\u012d': 'i', '\u014f': 'o', '\u016d': 'u' };
  async function warmPhonemeBank(pack, context, english) {
    if (!english || typeof root.getAudio !== 'function' || typeof root.addEventListener !== 'function' || !pack.items.some(item => item.phonemes.some(sound => !sound.audio))) return;
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
  async function recordedSound(sound, context, english) {
    const core = getCore();
    const key = core.key(sound.soundKey || sound.label).replace(/^\/+|\/+$/g, '');
    // A caller-supplied exact recording may be in any teaching language.
    const explicit = context.phonemeBank && context.phonemeBank[key];
    if (explicit) { const clip = await portableAudio(explicit, context); if (clip) return clip; }
    if (!english) return '';
    const candidates = [...new Set([key, soundAliases[key] || ({ ai: 'ay', ea: 'ee' })[key]].filter(Boolean))];
    for (const candidate of candidates) {
      checkAbort(context);
      const banks = [context.phonemeBank, root.__ALLO_PHONEME_AUDIO_BANK];
      for (const bank of banks) {
        const source = bank && bank[candidate];
        if (source) { const clip = await portableAudio(source, context); if (clip) return clip; }
      }
      if (typeof root.getAudio === 'function') {
        const source = await boundedWait(root.getAudio('phonemes', candidate), 6000, 'The sound library took too long to respond.', context.signal);
        const clip = await portableAudio(source, context); if (clip) return clip;
      }
    }
    return '';
  }
  async function prepareAudio(input, context = {}, onProgress) {
    const core = getCore(), pack = core.normalizeInput(input), errors = [];
    checkAbort(context);
    const english = /^(en(?:[-_]|$)|english$)/i.test(pack.language);
    if (english && typeof root.loadWordAudioBank === 'function' && pack.items.some(item => !item.wordAudio)) {
      try { await boundedWait(root.loadWordAudioBank(), 6000, 'The word library took too long to respond.', context.signal); }
      catch (error) { if (error.name === 'AbortError') throw error; }
    }
    await warmPhonemeBank(pack, context, english);
    let audioChars = pack.items.reduce((sum, item) => sum + item.wordAudio.length + item.phonemes.reduce((n, sound) => n + sound.audio.length, 0), 0);
    const keep = clip => {
      if (!clip) return '';
      if (audioChars + clip.length > core.LIMITS.totalAudioChars) throw new Error('The set has reached its portable audio size limit. Split it into smaller lists.');
      audioChars += clip.length; return clip;
    };
    let ttsUnavailable = false;
    for (let index = 0; index < pack.items.length; index++) {
      checkAbort(context);
      const item = pack.items[index];
      if (!item.wordAudio) {
        try {
          const wordKey = core.key(item.word);
          const bank = english && !wordKey.includes(' ') && (context.wordBank || root._CACHE_WORD_AUDIO_BANK);
          let clip = bank && await portableAudio(bank[wordKey], context);
          if (!clip && !ttsUnavailable && typeof context.callTTS === 'function') {
            const voice = context.selectedVoice || undefined;
            const source = await boundedWait(context.callTTS(item.word, voice, typeof context.ttsSpeed === 'number' ? context.ttsSpeed : undefined, {
              language: pack.language,
              allowProviderFallback: !/^(af_|am_|bf_|bm_)/i.test(String(voice || '')),
              signal: context.signal
            }), 45000, 'Word audio preparation timed out.', context.signal);
            checkAbort(context);
            clip = await portableAudio(source, context);
          }
          if (clip) item.wordAudio = keep(clip);
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
        try { sound.audio = keep(await recordedSound(sound, context, english)); }
        catch (error) { if (error.name === 'AbortError') throw error; errors.push(item.word + ' /' + sound.label + '/: ' + core.text(error.message, 120)); }
      }
      if (typeof onProgress === 'function') onProgress({ completed: index + 1, total: pack.items.length, word: item.word, coverage: core.audioCoverage(pack) });
    }
    checkAbort(context);
    const coverage = core.audioCoverage(pack), incomplete = coverage.words < coverage.totalWords || coverage.phonemes < coverage.totalPhonemes;
    pack.audioStatus = { ...coverage, errors, message: incomplete ? 'Some recordings are unavailable. Available clips were kept.' : 'All word and prepared sound recordings are ready.' };
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
    checkAbort(context);
    if (typeof context.ensurePptx === 'function') await context.ensurePptx();
    const Constructor = context.PptxGenJS || root.PptxGenJS;
    if (typeof Constructor !== 'function') throw new Error('PowerPoint export is unavailable. Reconnect once to load the PowerPoint exporter, then try again.');
    const cards = Array.isArray(sequence) ? sequence : core.createSequence(pack, options);
    if (!cards.length) throw new Error('Add at least one word to export.');
    const pptx = new Constructor();
    pptx.layout = 'LAYOUT_WIDE'; pptx.author = 'AlloFlow'; pptx.subject = 'Classroom word practice'; pptx.title = pack.title;
    pptx.company = 'AlloFlow'; pptx.lang = pack.language; pptx.theme = { headFontFace: 'Arial', bodyFontFace: 'Arial', lang: pack.language };
    const warnings = new Set(), items = new Map(pack.items.map(item => [item.id, item])), decoded = new Map(), converted = new Map(), sequences = new Map();
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
      slide.addText(pack.title, { x: 0.55, y: 0.2, w: 12.2, h: 0.4, fontFace: 'Arial', fontSize: 16, color: '475569', margin: 0, fit: 'shrink' });
      slide.addText(label, { x: 0.55, y: 6.96, w: 12.2, h: 0.25, fontSize: 12, color: '475569', margin: 0 });
      return slide;
    }
    function mainWord(slide, word, card, fixed = false) {
      const left = card.position && card.position.endsWith('left'), right = card.position && card.position.endsWith('right');
      const corner = !fixed && (left || right);
      const box = corner ? { x: left ? 0.6 : 6.7, y: card.position.startsWith('top') ? 1.2 : 3.65, w: 6, h: 2.1 } : { x: 0.7, y: 2.0, w: 11.9, h: 2.6 };
      const longest = Math.max(...word.split(/\s+/).map(part => part.length));
      const fontSize = Math.max(19, Math.min(100 * (Number(card.scale) || 1), (corner ? 580 : 1080) / Math.max(6, longest)));
      slide.addText(word, { ...box, fontFace: 'Arial', fontSize, bold: true, color: '172554', align: 'center', valign: 'mid', margin: 0.05, fit: 'shrink', breakLine: false });
    }
    async function addAudio(slide, item) {
      if (!options.includeAudio) return;
      let word = '', sounds = '';
      if (item.wordAudio) {
        try { word = await wordMedia(item.wordAudio); }
        catch (_) { warnings.add('Word audio for “' + item.word + '” could not be converted for PowerPoint.'); }
      } else warnings.add('No word recording is included for “' + item.word + '”.');
      if (item.phonemes.length) {
        if (item.phonemes.some(sound => !sound.audio)) warnings.add('The sound sequence for “' + item.word + '” is incomplete and was not included.');
        else try { sounds = await soundsMedia(item); } catch (_) { warnings.add('The sound sequence for “' + item.word + '” could not be converted for PowerPoint.'); }
      }
      checkAbort(context);
      [[word, 'Hear word'], [sounds, 'Hear sounds']].forEach(([source, label], index) => {
        if (!source) return;
        const x = 0.75 + index * 2.5;
        // PptxGenJS expects an extension-bearing audio MIME and base64 payload.
        const data = source.replace(/^data:audio\/(mpeg|mp3);/i, 'audio/mp3;').replace(/^data:audio\/(x-wav|wave|wav);/i, 'audio/wav;');
        slide.addMedia({ type: 'audio', data, x, y: 6.03, w: 0.48, h: 0.48 });
        slide.addText(label, { x: x + 0.58, y: 6.06, w: 1.8, h: 0.3, fontSize: 14, color: '1E3A8A', margin: 0 });
      });
    }
    const chunks = value => {
      const result = []; let remaining = value;
      while (remaining.length > 650) { let end = remaining.lastIndexOf(' ', 650); if (end < 350) end = 650; result.push(remaining.slice(0, end)); remaining = remaining.slice(end).trim(); }
      if (remaining) result.push(remaining); return result.length ? result : ['No definition has been added for this word.'];
    };
    try {
      for (let index = 0; index < cards.length; index++) {
        checkAbort(context);
        const card = cards[index], item = items.get(card.itemId);
        if (!item) throw new Error('The word list changed. Start the export again.');
        const footer = 'Word ' + (index + 1) + ' of ' + cards.length + ' · ' + ({ popup: 'Read together', blend: 'Say the sounds, then blend', vocabulary: 'Vocabulary', spelling: 'Listen and spell', sentence: 'Finish the Sentence' }[options.mode]);
        if (options.mode === 'sentence') {
          if (!item.sentenceActivity) throw new Error('A prepared sentence activity is missing.');
          const activity = item.sentenceActivity, prompt = slideBase(footer);
          prompt.addText(activity.prompt, { x: 0.85, y: 1.25, w: 11.65, h: 2.7, fontSize: activity.prompt.length > 500 ? 20 : 34, color: '172554', align: 'center', valign: 'mid', margin: 0.1, fit: 'shrink' });
          prompt.addText(activity.choices.map((choice, n) => String.fromCharCode(65 + n) + '. ' + choice).join('\n'), { x: 1.4, y: 4.05, w: 10.5, h: 1.65, fontSize: 23, color: '1E3A8A', align: 'center', margin: 0.02, fit: 'shrink' });
          if (typeof prompt.addNotes === 'function') prompt.addNotes('Answer: ' + activity.answer + '. Advance to reveal.');
          const answer = slideBase(footer + ' · Answer'); mainWord(answer, activity.answer, card, true); await addAudio(answer, item);
        } else if (options.mode === 'spelling') {
          const prompt = slideBase(footer);
          prompt.addText('Listen, then spell the word.', { x: 1, y: 2.0, w: 11.3, h: 1.5, fontSize: 44, color: '172554', align: 'center', margin: 0, fit: 'shrink' });
          prompt.addText(options.includeAudio && item.wordAudio ? 'Select Hear word. Advance to check your spelling.' : 'Teacher: say the word aloud. Advance to check spelling.', { x: 1, y: 3.8, w: 11.3, h: 0.7, fontSize: 22, color: '475569', align: 'center', margin: 0, fit: 'shrink' });
          if (typeof prompt.addNotes === 'function') prompt.addNotes('Say this word aloud if needed: ' + item.word);
          await addAudio(prompt, item);
          const answer = slideBase(footer + ' · Answer'); mainWord(answer, item.word, card, true);
        } else if (options.mode === 'vocabulary') {
          const body = [item.definition, item.example && 'Example: ' + item.example, ...item.translations.map(value => (value.language ? value.language + ': ' : '') + value.text)].filter(Boolean).join('\n\n');
          const pages = chunks(body);
          for (let page = 0; page < pages.length; page++) {
            const slide = slideBase(footer + (pages.length > 1 ? ' · Part ' + (page + 1) + '/' + pages.length : ''));
            slide.addText(item.word, { x: 0.8, y: 0.92, w: 11.7, h: 1.05, fontSize: 48, color: '172554', bold: true, align: 'center', margin: 0, fit: 'shrink' });
            slide.addText(pages[page], { x: 1.0, y: 2.15, w: 11.3, h: 3.5, fontSize: 26, color: '1E293B', valign: 'mid', margin: 0.08, fit: 'shrink', paraSpaceAfterPt: 14 });
            if (page === 0) await addAudio(slide, item);
          }
        } else {
          const slide = slideBase(footer); mainWord(slide, item.word, card, options.mode === 'blend');
          if (options.mode === 'blend') slide.addText(item.phonemes.length ? item.phonemes.map(sound => sound.label).join('  ·  ') : 'No sound sequence is prepared for this word.', { x: 0.8, y: 4.85, w: 11.7, h: 0.7, fontSize: 30, color: '1E3A8A', align: 'center', margin: 0, fit: 'shrink' });
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
